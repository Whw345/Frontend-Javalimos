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

const DOC_WEEK3 = "Semana3_LaCelula.pdf";
const DOC_WEEK4 = "Semana4_CicloCelularYADN.pdf";

/** Temas de semanas anteriores: el Debate los cruza con los de la semana actual. */
export const biologyEarlierWeeksAtoms: Atom[] = [
  {
    id: "atom-nucleo",
    concepto: "Núcleo celular",
    definicion: "El núcleo celular guarda el ADN y controla la actividad de la célula eucariota.",
    confusiones: [
      "El núcleo celular produce la energía de la célula.",
      "Las bacterias tienen un núcleo celular rodeado de membrana.",
    ],
    relacionados: ["Cromosoma", "Célula eucariota"],
    fuente: { documento: DOC_WEEK3, pagina: 3, fragmento: "…el núcleo contiene el material genético…" },
    semana: 3,
    dificultad: 1,
  },
  {
    id: "atom-mitocondria",
    concepto: "Mitocondria",
    definicion:
      "La mitocondria realiza la respiración celular y produce la energía de la célula en forma de ATP.",
    confusiones: [
      "La mitocondria guarda el ADN principal de la célula.",
      "La mitocondria solo existe en las células vegetales.",
    ],
    relacionados: ["Célula eucariota", "Respiración celular"],
    fuente: { documento: DOC_WEEK3, pagina: 6, fragmento: "…la mitocondria sintetiza ATP…" },
    semana: 3,
    dificultad: 2,
  },
  {
    id: "atom-ciclo-celular",
    concepto: "Ciclo celular",
    definicion:
      "El ciclo celular alterna una interfase de crecimiento y duplicación con una fase de división.",
    confusiones: [
      "El ciclo celular termina cuando la célula duplica su ADN.",
      "Todas las células se dividen sin control durante el ciclo celular.",
    ],
    relacionados: ["Interfase", "Mitosis", "Punto de control"],
    fuente: { documento: DOC_WEEK4, pagina: 2, fragmento: "…interfase y fase M…" },
    semana: 4,
    dificultad: 1,
  },
  {
    id: "atom-replicacion",
    concepto: "Replicación del ADN",
    definicion:
      "La replicación del ADN es semiconservativa: cada molécula nueva conserva una hebra original.",
    confusiones: [
      "La replicación del ADN crea dos moléculas con hebras totalmente nuevas.",
      "La replicación del ADN ocurre durante la anafase.",
    ],
    relacionados: ["Interfase", "Fase S", "Cromosoma"],
    fuente: { documento: DOC_WEEK4, pagina: 5, fragmento: "…cada hebra sirve de molde…" },
    semana: 4,
    dificultad: 2,
  },
  {
    id: "atom-cromosoma",
    concepto: "Cromosoma",
    definicion:
      "Un cromosoma es ADN compactado con proteínas; tras duplicarse tiene dos cromátidas hermanas unidas por el centrómero.",
    confusiones: [
      "Un cromosoma es una proteína que produce energía.",
      "Las cromátidas hermanas provienen de progenitores distintos.",
    ],
    relacionados: ["Cromosomas homólogos", "Centrómero", "Replicación del ADN"],
    fuente: { documento: DOC_WEEK4, pagina: 7, fragmento: "…dos cromátidas unidas por el centrómero…" },
    semana: 4,
    dificultad: 2,
  },
];
