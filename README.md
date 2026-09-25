# Monitor Cidadão

Aplicação cívica. Na Fase 1 o voto de exemplo é protegido no navegador, antes de qualquer envio.

## Preparar o ambiente

1. Copie o exemplo de variáveis e preencha com o projeto Supabase. Não use a chave `service_role`.

```bash
cp .env.local.example .env.local
```

2. No SQL Editor do Supabase, aplique a migration `supabase/migrations/20260925000000_fase1_sigilo.sql`.

3. Suba a aplicação e rode os testes:

```bash
npm install
npm run dev
npm test
```

A verificação manual do sigilo fica em `/dev/sigilo`. Essa rota não é tela de produto. As telas de uso diário (entrada, painel) ainda não existem.

`npm run typecheck` confere o TypeScript sem gerar arquivo.
