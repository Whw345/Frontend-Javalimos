import type { OrdenaAnswer, OrdenaPayload, OrdenaSolution } from "./schema";

export const ordenaPayloadFixture: OrdenaPayload = {
  steps: [
    { id: "s-anafase", text: "Anafase: las cromátidas hermanas se separan hacia los polos." },
    { id: "s-profase", text: "Profase: la cromatina se condensa en cromosomas visibles." },
    { id: "s-telofase", text: "Telofase: se forman dos nuevas envolturas nucleares." },
    { id: "s-metafase", text: "Metafase: los cromosomas se alinean en el plano ecuatorial." },
  ],
};

export const ordenaSolutionFixture: OrdenaSolution = {
  order: ["s-profase", "s-metafase", "s-anafase", "s-telofase"],
  explanation: "Profase, metafase, anafase y telofase.",
};

export const ordenaAnswerFixture: OrdenaAnswer = {
  order: ["s-profase", "s-anafase", "s-metafase", "s-telofase"],
};
