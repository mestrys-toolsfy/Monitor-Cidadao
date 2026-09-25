import type { Metadata } from "next";
import Link from "next/link";
import { PageMain } from "@/components/layout/page-main";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/chip";
import { listarProposicoesRecentes } from "@/lib/api/camara";
import { listarMateriasRecentes } from "@/lib/api/senado";
import { limparTextoPublico, rotuloCivico, traduzirTermoCivico } from "@/lib/civic/linguagem";
import type { ItemCongresso } from "@/lib/validators/governo";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Linha do tempo · Monitor Cidadão",
  description: "Propostas públicas recentes da Câmara e do Senado, em linguagem cidadã.",
};

const GLOSSARIO = ["PL", "PEC", "PLP", "MPV", "CEAP", "relator", "obstrução"] as const;

const LIMITE = 8;

interface Bloco {
  itens: ItemCongresso[];
  erro: boolean;
}

async function carregar(consulta: () => Promise<ItemCongresso[]>): Promise<Bloco> {
  try {
    return { itens: await consulta(), erro: false };
  } catch {
    return { itens: [], erro: true };
  }
}

function dataPt(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    return "";
  }
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function ementaCurta(texto: string): string {
  const limpo = limparTextoPublico(texto);
  if (limpo.length <= 280) {
    return limpo;
  }
  return `${limpo.slice(0, 277).trimEnd()}…`;
}

function rotuloItem(item: ItemCongresso): string {
  const traducao = traduzirTermoCivico(item.sigla);
  if (traducao) {
    return `${item.sigla} · ${traducao}`;
  }
  if (item.tipoDocumento) {
    return item.tipoDocumento;
  }
  return item.titulo;
}

function BlocoCasa({
  titulo,
  intro,
  vazio,
  erro,
  origem,
  bloco,
}: {
  titulo: string;
  intro: string;
  vazio: string;
  erro: string;
  origem: string;
  bloco: Bloco;
}) {
  return (
    <section className="flex flex-col gap-space-md">
      <div className="flex flex-col gap-space-sm">
        <h2 className="text-headline-sm text-on-surface">{titulo}</h2>
        <p className="max-w-2xl text-body-lg text-on-surface">{intro}</p>
      </div>
      {bloco.erro ? (
        <p className="rounded bg-error-container px-4 py-3 text-body-md text-on-error-container" role="alert">
          {erro}
        </p>
      ) : null}
      {!bloco.erro && bloco.itens.length === 0 ? (
        <p className="text-body-lg text-on-surface-variant" role="status">
          {vazio}
        </p>
      ) : null}
      {bloco.itens.length > 0 ? (
        <ul className="flex flex-col gap-space-md">
          {bloco.itens.map((item) => {
            const data = dataPt(item.data);
            return (
              <li key={`${item.casa}-${item.id}`}>
                <Card as="article" className="flex flex-col gap-space-sm">
                  <h3 className="text-headline-sm text-on-surface">{rotuloItem(item)}</h3>
                  <p className="text-body-md text-on-surface-variant">
                    {item.titulo}
                    {data ? ` · ${data}` : ""}
                  </p>
                  <p className="text-body-lg text-on-surface">{ementaCurta(item.ementa)}</p>
                  <a
                    className="inline-flex min-h-12 items-center text-label-lg text-secondary underline"
                    href={item.fonteUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {origem}
                  </a>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

export default async function LinhaDoTempoPage() {
  const [camara, senado] = await Promise.all([
    carregar(() => listarProposicoesRecentes(LIMITE)),
    carregar(() => listarMateriasRecentes(LIMITE)),
  ]);

  return (
    <PageMain className="gap-space-xl">
      <div className="flex flex-col gap-space-md">
        <StatusChip>Dado público · Lei de Acesso à Informação</StatusChip>
        <h1 className="text-headline-lg text-on-surface">Linha do tempo</h1>
        <p className="max-w-2xl text-body-lg text-on-surface">
          Aqui estão propostas públicas da Câmara e do Senado. O voto que você protege no navegador não aparece nesta
          página.
        </p>
        <Link className="inline-flex min-h-12 items-center text-label-lg text-secondary underline" href="/">
          Voltar ao início
        </Link>
      </div>

      <BlocoCasa
        bloco={camara}
        erro="A Câmara dos Deputados não respondeu agora. O que o Senado tiver enviado continua abaixo."
        intro="Projetos de lei, propostas de emenda, projetos de lei complementar e medidas provisórias apresentados há pouco."
        origem="Ler na Câmara dos Deputados"
        titulo="Câmara dos Deputados"
        vazio="Nenhuma proposta recente da Câmara apareceu nesta consulta."
      />

      <BlocoCasa
        bloco={senado}
        erro="O Senado Federal não respondeu agora. O que a Câmara tiver enviado continua acima."
        intro="Matérias que o Senado atualizou nos últimos dias."
        origem="Ler no Senado Federal"
        titulo="Senado Federal"
        vazio="Nenhuma matéria recente do Senado apareceu nesta consulta."
      />

      <section className="flex flex-col gap-space-sm">
        <h2 className="text-headline-sm text-on-surface">Palavras da Câmara e do Senado</h2>
        <ul className="flex flex-wrap gap-space-sm">
          {GLOSSARIO.map((termo) => (
            <li key={termo}>
              <StatusChip tone="neutro">{rotuloCivico(termo)}</StatusChip>
            </li>
          ))}
        </ul>
      </section>
    </PageMain>
  );
}
