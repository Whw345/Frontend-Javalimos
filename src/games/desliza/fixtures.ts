import type { DeslizaAnswer, DeslizaPayload, DeslizaSolution } from "./schema";

/** Datos de ejemplo realistas (Biología celular, semana 5) para tests y Storybook. */
export const deslizaPayloadFixture: DeslizaPayload = {
  secondsPerCard: 8,
  statements: [
    {
      id: "st-1",
      text: "La mitosis produce dos células hijas genéticamente idénticas a la célula madre.",
      concepto: "Mitosis",
    },
    {
      id: "st-2",
      text: "La meiosis ocurre en todas las células del cuerpo para reparar tejidos.",
      concepto: "Meiosis",
    },
    {
      id: "st-3",
      text: "Durante la fase S de la interfase se duplica el ADN.",
      concepto: "Interfase",
    },
    {
      id: "st-4",
      text: "La citocinesis es la división del núcleo en dos núcleos hijos.",
      concepto: "Citocinesis",
    },
    {
      id: "st-5",
      text: "El crossing-over intercambia segmentos entre cromosomas homólogos en la profase I.",
      concepto: "Crossing-over",
    },
    {
      id: "st-6",
      text: "El huso mitótico está formado por microtúbulos que separan las cromátidas.",
      concepto: "Huso mitótico",
    },
  ],
};

export const deslizaSolutionFixture: DeslizaSolution = [
  {
    statementId: "st-1",
    isTrue: true,
    explanation: "Verdadera: así se mantiene el mismo número de cromosomas.",
  },
  {
    statementId: "st-2",
    isTrue: false,
    explanation: "Falsa: la meiosis ocurre solo en células germinales y forma gametos.",
  },
  { statementId: "st-3", isTrue: true, explanation: "Verdadera: la fase S es la de síntesis de ADN." },
  {
    statementId: "st-4",
    isTrue: false,
    explanation: "Falsa: la citocinesis divide el citoplasma; el núcleo se divide en la cariocinesis.",
  },
  {
    statementId: "st-5",
    isTrue: true,
    explanation: "Verdadera: ocurre en la profase I y genera variabilidad.",
  },
  { statementId: "st-6", isTrue: true, explanation: "Verdadera: los microtúbulos tiran de las cromátidas." },
];

export const deslizaAnswerFixture: DeslizaAnswer = {
  responses: [
    { statementId: "st-1", verdict: true, elapsedMs: 2100 },
    { statementId: "st-2", verdict: false, elapsedMs: 3400 },
    { statementId: "st-3", verdict: false, elapsedMs: 5200 },
    { statementId: "st-4", verdict: false, elapsedMs: 4100 },
    { statementId: "st-5", verdict: true, elapsedMs: 2600 },
    { statementId: "st-6", verdict: null, elapsedMs: null },
  ],
};
