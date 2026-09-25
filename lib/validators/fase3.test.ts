import { describe, expect, it } from "vitest";
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

  it("o objeto enviado ao servidor não leva o voto em claro", () => {
    const payload = montarPayloadBancada({
      cargo: "deputado_federal",
      brancoOuNulo: false,
      identificador: "camara:73701:Benedita da Silva:PT:RJ",
    });
    expect(payload.politico_id).toContain("73701");

    const envelope = {
      v: 1 as const,
      alg: "RSA-OAEP-256+A256GCM" as const,
      ct: "Y3Q",
      iv: "aXY",
      wrapped_key: "d3JhcA",
      aad: "mc-voto-v1|usuario|registro",
    };
    expect(envelopeVotoSchema.safeParse(envelope).success).toBe(true);
    expect(contemCampoDeVotoEmClaro(envelope)).toBe(false);
    expect(contemCampoDeVotoEmClaro({ ...envelope, politico_id: payload.politico_id })).toBe(true);
  });
});
