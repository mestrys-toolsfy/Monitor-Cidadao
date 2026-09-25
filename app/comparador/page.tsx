import { ComparadorPainel } from "@/components/comparador/comparador-painel";

export const dynamic = "force-dynamic";

export default function ComparadorPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-8 md:px-8">
      <h1 className="text-[2rem] font-semibold leading-10 text-on-surface">Como eles votaram</h1>
      <p className="max-w-2xl text-on-surface">
        A matriz usa o voto individual publicado pela Câmara. Votou sim, votou não, abstenção ou tentativa de atrasar
        a votação. Presidente, governador, senador e deputado estadual ainda não entram nesta comparação.
      </p>
      <ComparadorPainel />
    </main>
  );
}
