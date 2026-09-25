import { ComparadorPainel } from "@/components/comparador/comparador-painel";
import { PageMain } from "@/components/layout/page-main";

export const dynamic = "force-dynamic";

export default function ComparadorPage() {
  return (
    <PageMain>
      <h1 className="text-headline-lg text-on-surface">Como eles votaram</h1>
      <p className="max-w-2xl text-body-lg text-on-surface">
        A matriz usa o voto individual publicado pela Câmara. Votou sim, votou não, abstenção ou tentativa de atrasar
        a votação. Presidente, governador, senador e deputado estadual ainda não entram nesta comparação.
      </p>
      <ComparadorPainel />
    </PageMain>
  );
}
