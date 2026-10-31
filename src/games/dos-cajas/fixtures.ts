import type { DosCajasAnswer, DosCajasPayload, DosCajasSolution } from "./schema";

export const dosCajasPayloadFixture: DosCajasPayload = {
  boxes: { a: "Mitosis", b: "Meiosis" },
  secondsPerCard: 6,
  cards: [
    { id: "k-1", text: "Produce dos células hijas" },
    { id: "k-2", text: "Ocurre crossing-over" },
    { id: "k-3", text: "Forma gametos" },
  ],
};

export const dosCajasSolutionFixture: DosCajasSolution = [
  { cardId: "k-1", box: "a", explanation: "La mitosis produce dos células." },
  { cardId: "k-2", box: "b", explanation: "El crossing-over es de la meiosis." },
  { cardId: "k-3", box: "b", explanation: "Los gametos salen de la meiosis." },
];

export const dosCajasAnswerFixture: DosCajasAnswer = {
  responses: [
    { cardId: "k-1", box: "a" },
    { cardId: "k-2", box: "a" },
    { cardId: "k-3", box: null },
  ],
};
