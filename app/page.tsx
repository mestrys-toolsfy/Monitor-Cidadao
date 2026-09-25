import Link from "next/link";
import { PageMain } from "@/components/layout/page-main";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <PageMain>
      <p className="max-w-2xl text-body-lg text-on-surface">
        Um espaço para acompanhar a atividade pública com clareza. Quando você registrar um voto, ele é protegido no
        seu navegador. A empresa não lê o conteúdo.
      </p>
      <div className="flex max-w-md flex-col gap-sm">
        <Button asChild>
          <Link href="/onboarding">Começar pelo compromisso de sigilo</Link>
        </Button>
        <Button asChild variant="outlined">
          <Link href="/comparador">Comparar como eles votaram</Link>
        </Button>
        <Button asChild variant="outlined">
          <Link href="/linha-do-tempo">Linha do tempo do Congresso</Link>
        </Button>
        <Button asChild variant="outlined">
          <Link href="/privacidade">Como o voto é protegido</Link>
        </Button>
      </div>
      <p className="max-w-2xl text-body-md text-on-surface-variant">
        Depois do compromisso, cadastre a bancada e abra o painel com a senha de sigilo.
      </p>
    </PageMain>
  );
}
