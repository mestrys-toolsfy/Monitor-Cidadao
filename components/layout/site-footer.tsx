import Link from "next/link";
import { faixaPagina } from "@/components/layout/page-main";
import { cn } from "@/lib/utils";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-outline-variant bg-surface-container-low py-space-lg text-body-sm text-on-surface-variant">
      <div className={cn(faixaPagina, "flex flex-col gap-space-sm")}>
        <p>© 2026 Mestry&apos;s Tecnologia e Consultoria em TI LTDA. Todos os direitos reservados.</p>
        <p>CNPJ 68.027.889/0001-34</p>
        <p>Rua Pais Leme, 215, Conj 1713, Pinheiros/SP</p>
        <p>Central +55 11 3038-7214</p>
        <p>LGPD +55 11 5283-9382</p>
        <p>
          <a className="inline-flex min-h-12 items-center underline" href="mailto:contato@mestrys.com.br">
            contato@mestrys.com.br
          </a>
        </p>
        <Link className="inline-flex min-h-12 items-center text-label-lg text-secondary underline" href="/privacidade">
          Política de privacidade
        </Link>
      </div>
    </footer>
  );
}
