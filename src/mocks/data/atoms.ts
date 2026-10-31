import type { Atom } from "@/games/types";

const DOC = "Semana5_DivisionCelular.pdf";

/** Átomos de ejemplo como los generaría el backend desde el PDF de la semana 5. */
export const biologyWeek5Atoms: Atom[] = [
  {
    id: "atom-mitosis",
    concepto: "Mitosis",
    definicion: "La mitosis produce dos células hijas genéticamente idénticas a la célula madre.",
    confusiones: [
      "La mitosis produce cuatro células hijas con la mitad de cromosomas.",
      "La mitosis solo ocurre en las células sexuales.",
    ],
    relacionados: ["Meiosis", "Ciclo celular", "Citocinesis"],
    fuente: { documento: DOC, pagina: 4, fragmento: "…dos células hijas idénticas…" },
    semana: 5,
    dificultad: 1,
  },
  {
    id: "atom-meiosis",
    concepto: "Meiosis",
    definicion: "La meiosis forma gametos con la mitad del número de cromosomas de la célula madre.",
    confusiones: [
      "La meiosis ocurre en todas las células del cuerpo para reparar tejidos.",
      "La meiosis tiene una sola división celular.",
    ],
    relacionados: ["Mitosis", "Crossing-over", "Gameto"],
    fuente: { documento: DOC, pagina: 8, fragmento: "…reduce a la mitad el número cromosómico…" },
    semana: 5,
    dificultad: 1,
  },
  {
    id: "atom-interfase",
    concepto: "Interfase",
    definicion: "Durante la fase S de la interfase se duplica el ADN.",
    confusiones: [
      "En la interfase la célula está inactiva y no realiza ninguna función.",
      "El ADN se duplica durante la anafase.",
    ],
    relacionados: ["Ciclo celular", "Fase S"],
    fuente: { documento: DOC, pagina: 2, fragmento: "…en la fase S se replica el ADN…" },
    semana: 5,
    dificultad: 2,
  },
  {
    id: "atom-citocinesis",
    concepto: "Citocinesis",
    definicion: "La citocinesis es la división del citoplasma al final de la división celular.",
    confusiones: [
      "La citocinesis es la división del núcleo en dos núcleos hijos.",
      "La citocinesis ocurre antes de la profase.",
    ],
    relacionados: ["Mitosis", "Telofase"],
    fuente: { documento: DOC, pagina: 6, fragmento: "…la citocinesis divide el citoplasma…" },
    semana: 5,
    dificultad: 2,
  },
  {
    id: "atom-crossing-over",
    concepto: "Crossing-over",
    definicion: "El crossing-over intercambia segmentos entre cromosomas homólogos en la profase I.",
    confusiones: [
      "El crossing-over ocurre entre cromátidas hermanas durante la mitosis.",
      "El crossing-over reduce la variabilidad genética.",
    ],
    relacionados: ["Meiosis", "Cromosomas homólogos"],
    fuente: { documento: DOC, pagina: 9, fragmento: "…intercambio de segmentos en profase I…" },
    semana: 5,
    dificultad: 3,
  },
  {
    id: "atom-huso",
    concepto: "Huso mitótico",
    definicion: "El huso mitótico está formado por microtúbulos que separan las cromátidas.",
    confusiones: [
      "El huso mitótico está formado por filamentos de ADN.",
      "El huso mitótico une los cromosomas homólogos en la telofase.",
    ],
    relacionados: ["Mitosis", "Centrómero", "Anafase"],
    fuente: { documento: DOC, pagina: 5, fragmento: "…microtúbulos del huso…" },
    semana: 5,
    dificultad: 2,
  },
  {
    id: "atom-anafase",
    concepto: "Anafase",
    definicion: "En la anafase las cromátidas hermanas se separan hacia polos opuestos.",
    confusiones: [
      "En la anafase los cromosomas se alinean en el centro de la célula.",
      "En la anafase se forma la nueva membrana nuclear.",
    ],
    relacionados: ["Metafase", "Telofase", "Huso mitótico"],
    fuente: { documento: DOC, pagina: 5, fragmento: "…migran a polos opuestos…" },
    semana: 5,
    dificultad: 3,
  },
  {
    id: "atom-homologos",
    concepto: "Cromosomas homólogos",
    definicion: "Los cromosomas homólogos son un par con los mismos genes, uno de cada progenitor.",
    confusiones: [
      "Los cromosomas homólogos son copias idénticas creadas en la fase S.",
      "Los cromosomas homólogos solo existen en las bacterias.",
    ],
    relacionados: ["Meiosis", "Crossing-over"],
    fuente: { documento: DOC, pagina: 7, fragmento: "…uno heredado de cada progenitor…" },
    semana: 5,
    dificultad: 3,
  },
];
