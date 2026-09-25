import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/votos/route";
import { toBase64Url } from "@/lib/crypto/bytes";
import { montarPayloadBancada } from "@/lib/civic/escolha";
import { bancadaEntradaSchema } from "@/lib/validators/bancada";
import { consentimentoOnboardingSchema } from "@/lib/validators/onboarding";
import { contemCampoDeVotoEmClaro, envelopeVotoSchema } from "@/lib/validators/voto";

describe("onboarding e bancada", () => {
  it("recusa seguir sem o compromisso de sigilo", () => {
    expect(consentimentoOnboardingSchema.safeParse({ aceitaSigilo: false, optInBackup: false }).success).toBe(false);
    expect(consentimentoOnboardingSchema.safeParse({ aceitaSigilo: true, optInBackup: true }).success).toBe(true);
  });

  it("recusa cargo fora da lista dos cinco", () => {
    const resultado = bancadaEntradaSchema.safeParse({
      cargo: "vereador",
      brancoOuNulo: false,
      identificador: "manual:Nome:PT:SP",
      anoEleicao: 2022,
      turno: 1,
    });
    expect(resultado.success).toBe(false);
  });

  it("o objeto enviado ao servidor não leva o voto em claro", async () => {
    const payload = montarPayloadBancada({
      cargo: "deputado_federal",
      brancoOuNulo: false,
      identificador: "camara:73701:Benedita da Silva:PT:RJ",
    });
    expect(payload.politico_id).toContain("73701");

    const envelope = {
      v: 1 as const,
      alg: "RSA-OAEP-256+A256GCM" as const,
      ct: toBase64Url(new Uint8Array([1, 2, 3, 4])),
      iv: toBase64Url(new Uint8Array(12)),
      wrapped_key: toBase64Url(new Uint8Array([5, 6, 7, 8])),
      aad: "mc-voto-v1|usuario|registro",
    };
    expect(envelopeVotoSchema.safeParse(envelope).success).toBe(true);
    expect(Object.keys(envelope)).not.toContain("politico_id");
    expect(contemCampoDeVotoEmClaro(envelope)).toBe(false);
    expect(contemCampoDeVotoEmClaro({ ...envelope, politico_id: payload.politico_id })).toBe(true);

    const pedido = new Request("http://localhost/api/votos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
    });
    const aceito = await POST(pedido);
    expect(aceito.status).not.toBe(400);

    const recusado = await POST(
      new Request("http://localhost/api/votos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...envelope, politico_id: payload.politico_id }),
      }),
    );
    expect(recusado.status).toBe(400);
  });
});
