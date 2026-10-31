import type { ParejasAnswer, ParejasPayload, ParejasSolution } from "./schema";

/** Datos de ejemplo realistas (Biología celular, semana 5) para tests y Storybook. */
export const parejasPayloadFixture: ParejasPayload = {
  concepts: [
    { id: "c-mitosis", text: "Mitosis" },
    { id: "c-meiosis", text: "Meiosis" },
    { id: "c-citocinesis", text: "Citocinesis" },
    { id: "c-anafase", text: "Anafase" },
  ],
  definitions: [
    { id: "d-anafase", text: "Las cromátidas hermanas se separan hacia polos opuestos." },
    { id: "d-mitosis", text: "Produce dos células hijas genéticamente idénticas a la célula madre." },
    { id: "d-citocinesis", text: "División del citoplasma al final de la división celular." },
    { id: "d-meiosis", text: "Forma gametos con la mitad del número de cromosomas." },
  ],
};

export const parejasSolutionFixture: ParejasSolution = [
  { conceptId: "c-mitosis", definitionId: "d-mitosis", explanation: "Mantiene el número de cromosomas." },
  { conceptId: "c-meiosis", definitionId: "d-meiosis", explanation: "Reduce a la mitad los cromosomas." },
  { conceptId: "c-citocinesis", definitionId: "d-citocinesis", explanation: "Divide el citoplasma." },
  { conceptId: "c-anafase", definitionId: "d-anafase", explanation: "Las cromátidas migran a los polos." },
];

export const parejasAnswerFixture: ParejasAnswer = {
  pairs: [
    { conceptId: "c-mitosis", definitionId: "d-mitosis" },
    { conceptId: "c-meiosis", definitionId: "d-citocinesis" },
    { conceptId: "c-citocinesis", definitionId: "d-meiosis" },
  ],
};
