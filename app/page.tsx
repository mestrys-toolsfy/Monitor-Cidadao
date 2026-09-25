import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-8 md:px-8">
      <h1 className="text-[2rem] font-semibold leading-10 text-on-surface">Monitor Cidadão</h1>
      <p className="max-w-2xl text-base leading-6 text-on-surface">
        Um espaço para acompanhar a atividade pública com clareza. Quando você registrar um voto, ele é protegido no
        seu navegador. A empresa não lê o conteúdo.
      </p>
      <Link className="inline-flex min-h-12 items-center font-semibold text-secondary underline" href="/onboarding">
        Começar pelo compromisso de sigilo
      </Link>
      <Link className="inline-flex min-h-12 items-center font-semibold text-secondary underline" href="/comparador">
        Comparar como eles votaram
      </Link>
      <Link className="inline-flex min-h-12 items-center font-semibold text-secondary underline" href="/linha-do-tempo">
        Linha do tempo do Congresso
      </Link>
      <Link className="inline-flex min-h-12 items-center font-semibold text-secondary underline" href="/privacidade">
        Como o voto é protegido
      </Link>
      <p className="max-w-2xl text-sm leading-5 text-on-surface-variant">
        Depois do compromisso, cadastre a bancada e abra o painel com a senha de sigilo.
      </p>
    </main>
  );
}
