import type { Metadata } from "next";
import { PageMain } from "@/components/layout/page-main";

export const metadata: Metadata = {
  title: "Privacidade · Monitor Cidadão",
  description: "O voto é cifrado no navegador. A empresa não lê o conteúdo.",
};

export default function PrivacidadePage() {
  return (
    <PageMain className="gap-md">
      <h1 className="text-headline-lg text-on-surface">Privacidade</h1>
      <p className="max-w-2xl text-body-lg text-on-surface">
        O voto é cifrado no navegador, antes de qualquer envio. A Mestry&apos;s Tecnologia e Consultoria em TI LTDA não
        lê o conteúdo do voto.
      </p>
      <p className="max-w-2xl text-body-lg text-on-surface">
        A senha de sigilo não é enviada ao servidor. A chave que abre o voto fica no seu aparelho. Uma cópia embaralhada
        só é guardada na nuvem se você autorizar.
      </p>
    </PageMain>
  );
}
