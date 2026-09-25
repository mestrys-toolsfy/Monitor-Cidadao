-- Fase 1: perfil do cidadão e voto cifrado.
-- O voto em claro não tem coluna. A chave privada em claro também não.

create schema if not exists private;

comment on schema private is 'Funções internas. Não expor na API do Supabase.';

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

-- Atualiza updated_at. Security invoker: roda com o papel de quem fez o update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

comment on function public.set_updated_at() is 'Preenche updated_at em updates do perfil.';

revoke all on function public.set_updated_at() from public;
revoke all on function public.set_updated_at() from anon;
grant execute on function public.set_updated_at() to authenticated;

-- Impede gravar o blob da chave sem opt-in explícito.
create or replace function public.rejeitar_backup_sem_opt_in()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.privkey_backup_blob is not null and new.sigilo_opt_in is not true then
    raise exception 'Backup da chave privada exige opt-in explícito';
  end if;
  if new.recovery_backup_blob is not null and new.sigilo_opt_in is not true then
    raise exception 'Backup de recuperação exige opt-in explícito';
  end if;
  return new;
end;
$$;

comment on function public.rejeitar_backup_sem_opt_in() is
  'Recusa cópia cifrada da chave no servidor sem sigilo_opt_in.';

revoke all on function public.rejeitar_backup_sem_opt_in() from public;
revoke all on function public.rejeitar_backup_sem_opt_in() from anon;
grant execute on function public.rejeitar_backup_sem_opt_in() to authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  public_key_jwk jsonb,
  public_key_sha256 text,
  privkey_backup_blob jsonb,
  recovery_backup_blob jsonb,
  sigilo_opt_in boolean not null default false,
  sigilo_consent_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint profiles_jwk_publico_sem_privada check (
    public_key_jwk is null
    or (
      jsonb_typeof(public_key_jwk) = 'object'
      and not (public_key_jwk ? 'd')
      and not (public_key_jwk ? 'p')
      and not (public_key_jwk ? 'q')
      and not (public_key_jwk ? 'dp')
      and not (public_key_jwk ? 'dq')
      and not (public_key_jwk ? 'qi')
    )
  )
);

comment on table public.profiles is
  'Perfil do cidadão. A chave privada em claro nunca é gravada aqui.';
comment on column public.profiles.public_key_jwk is
  'Somente a chave pública RSA (JWK). Não pode conter componente privado.';
comment on column public.profiles.public_key_sha256 is
  'Impressão SHA-256 da chave pública, para o navegador conferir antes de cifrar.';
comment on column public.profiles.privkey_backup_blob is
  'Cópia opt-in do blob AES-GCM da chave privada. Nunca PKCS#8 em claro.';
comment on column public.profiles.recovery_backup_blob is
  'Segundo blob, cifrado com o código de recuperação. O código em claro não é gravado.';
comment on column public.profiles.sigilo_opt_in is
  'Verdadeiro só depois de consentimento explícito para guardar a cópia cifrada.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger profiles_rejeitar_backup_sem_opt_in
  before insert or update on public.profiles
  for each row execute function public.rejeitar_backup_sem_opt_in();

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

revoke all on table public.profiles from public;
revoke all on table public.profiles from anon;
grant select, insert, update, delete on table public.profiles to authenticated;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy profiles_delete_own
  on public.profiles
  for delete
  to authenticated
  using ((select auth.uid()) = id);

-- Perfil vazio no cadastro. Não copia metadado editável pelo usuário.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

comment on function private.handle_new_user() is
  'Cria o perfil vazio quando o Auth registra o usuário. Não copia dado sensível.';

revoke all on function private.handle_new_user() from public;
revoke all on function private.handle_new_user() from anon;
revoke all on function private.handle_new_user() from authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

do $$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema private to supabase_auth_admin;
    grant execute on function private.handle_new_user() to supabase_auth_admin;
  end if;
end;
$$;

create table public.votos_cifrados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  schema_version smallint not null default 1,
  alg text not null,
  ciphertext bytea not null,
  iv bytea not null,
  wrapped_key bytea not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint votos_cifrados_schema_version_positiva check (schema_version >= 1),
  constraint votos_cifrados_alg_v1 check (
    schema_version <> 1 or alg = 'RSA-OAEP-256+A256GCM'
  ),
  constraint votos_cifrados_iv_12_bytes check (octet_length(iv) = 12)
);

comment on table public.votos_cifrados is
  'Voto já cifrado no navegador. Sem colunas de cargo, turno, ano ou político.';
comment on column public.votos_cifrados.ciphertext is
  'AES-GCM do payload, em bytea. O servidor não tem a chave para ler.';
comment on column public.votos_cifrados.iv is
  'IV do AES-GCM. Exatamente 12 bytes, único por cifra.';
comment on column public.votos_cifrados.wrapped_key is
  'Chave AES embrulhada com RSA-OAEP, em bytea. Não é o voto.';

-- Índice da chave estrangeira e do filtro de RLS.
create index votos_cifrados_user_id_idx on public.votos_cifrados (user_id);

alter table public.votos_cifrados enable row level security;
alter table public.votos_cifrados force row level security;

revoke all on table public.votos_cifrados from public;
revoke all on table public.votos_cifrados from anon;
grant select, insert, update, delete on table public.votos_cifrados to authenticated;

create policy votos_cifrados_select_own
  on public.votos_cifrados
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy votos_cifrados_insert_own
  on public.votos_cifrados
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy votos_cifrados_update_own
  on public.votos_cifrados
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy votos_cifrados_delete_own
  on public.votos_cifrados
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Registro do consentimento LGPD. Não guarda voto nem chave.
create table public.consentimentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  finalidade text not null,
  versao_texto text not null,
  aceito boolean not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint consentimentos_finalidade_nao_vazia check (char_length(btrim(finalidade)) > 0),
  constraint consentimentos_versao_nao_vazia check (char_length(btrim(versao_texto)) > 0)
);

comment on table public.consentimentos is
  'Histórico de consentimento do cidadão. Sem conteúdo de voto.';
comment on column public.consentimentos.finalidade is
  'Para que a pessoa autorizou o tratamento, por exemplo o backup da chave de sigilo.';
comment on column public.consentimentos.versao_texto is
  'Versão do texto mostrado no momento do aceite.';

create index consentimentos_user_id_idx on public.consentimentos (user_id);

alter table public.consentimentos enable row level security;
alter table public.consentimentos force row level security;

revoke all on table public.consentimentos from public;
revoke all on table public.consentimentos from anon;
grant select, insert, update, delete on table public.consentimentos to authenticated;

create policy consentimentos_select_own
  on public.consentimentos
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy consentimentos_insert_own
  on public.consentimentos
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy consentimentos_update_own
  on public.consentimentos
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy consentimentos_delete_own
  on public.consentimentos
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
