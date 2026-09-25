import { create } from "zustand";

/** Estado de interface do laboratório. Não guarda senha, chave nem voto. */
export type EtapaLab = "ocioso" | "trabalhando" | "pronto" | "falha";

interface LabUiState {
  etapa: EtapaLab;
  mensagem: string;
  definir: (etapa: EtapaLab, mensagem: string) => void;
}

export const useLabUiStore = create<LabUiState>((set) => ({
  etapa: "ocioso",
  mensagem: "",
  definir: (etapa, mensagem) => set({ etapa, mensagem }),
}));
