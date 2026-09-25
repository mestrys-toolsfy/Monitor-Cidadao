import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidade · Monitor Cidadão",
  description: "O voto é cifrado no navegador. A empresa não lê o conteúdo.",
};

export default function PrivacidadePage() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-4 px-4 py-8 md:px-8">
      <h1 className="text-[2rem] font-semibold leading-10 text-on-surface">Privacidade</h1>
      <p className="max-w-2xl text-base leading-6 text-on-surface">
        O voto é cifrado no navegador, antes de qualquer envio. A Mestry&apos;s Tecnologia e Consultoria em TI LTDA não
        lê o conteúdo do voto.
      </p>
      <p className="max-w-2xl text-base leading-6 text-on-surface">
        A senha de sigilo não é enviada ao servidor. A chave que abre o voto fica no seu aparelho. Uma cópia embaralhada
        só é guardada na nuvem se você autorizar.
      </p>
    </main>
  );
}
