import type { Atom } from "@/games/types";

const DOC = "Semana5_DivisionCelular.pdf";
const fuente = (pagina: number, fragmento: string) => ({ documento: DOC, pagina, fragmento });

/**
 * Átomo de procedimiento (Ordena, Encuentra el error).
 * Convención del mock: `confusiones[i]` es la versión equivocada de `pasos[i]`.
 */
export const mitosisPhasesAtom: Atom = {
  id: "atom-fases-mitosis",
  concepto: "Fases de la mitosis",
  definicion:
    "La mitosis avanza en profase, prometafase, metafase, anafase y telofase, y termina con la citocinesis.",
  pasos: [
    "Profase: la cromatina se condensa en cromosomas visibles.",
    "Prometafase: se rompe la envoltura nuclear.",
    "Metafase: los cromosomas se alinean en el plano ecuatorial.",
    "Anafase: las cromátidas hermanas se separan hacia los polos.",
    "Telofase: se forman dos nuevas envolturas nucleares.",
    "Citocinesis: el citoplasma se divide en dos células.",
  ],
  confusiones: [
    "Profase: el ADN se duplica por primera vez.",
    "Prometafase: se forma la nueva envoltura nuclear.",
    "Metafase: las cromátidas se separan hacia los polos.",
    "Anafase: los cromosomas se alinean en el centro.",
    "Telofase: los cromosomas homólogos se aparean.",
    "Citocinesis: el núcleo se divide en cuatro.",
  ],
  relacionados: ["Mitosis", "Huso mitótico"],
  fuente: fuente(5, "…profase, metafase, anafase, telofase…"),
  semana: 5,
  dificultad: 2,
};

/** Átomos con `categoria` para Dos cajas: ¿es de la mitosis o de la meiosis? */
const categoryAtom = (id: string, text: string, categoria: "Mitosis" | "Meiosis", pagina: number): Atom => ({
  id,
  concepto: text,
  definicion: text,
  confusiones: [],
  categoria,
  relacionados: [],
  fuente: fuente(pagina, text),
  semana: 5,
  dificultad: 1,
});

export const mitosisVsMeiosisAtoms: Atom[] = [
  categoryAtom("cat-1", "Produce dos células hijas", "Mitosis", 4),
  categoryAtom("cat-2", "Produce cuatro células hijas", "Meiosis", 8),
  categoryAtom("cat-3", "Las células hijas son idénticas a la madre", "Mitosis", 4),
  categoryAtom("cat-4", "Ocurre crossing-over", "Meiosis", 9),
  categoryAtom("cat-5", "Sirve para crecer y reparar tejidos", "Mitosis", 3),
  categoryAtom("cat-6", "Forma gametos", "Meiosis", 8),
  categoryAtom("cat-7", "Tiene una sola división", "Mitosis", 4),
  categoryAtom("cat-8", "Tiene dos divisiones sucesivas", "Meiosis", 8),
  categoryAtom("cat-9", "Mantiene el número de cromosomas", "Mitosis", 4),
  categoryAtom("cat-10", "Reduce a la mitad los cromosomas", "Meiosis", 8),
  categoryAtom("cat-11", "Ocurre en células somáticas", "Mitosis", 3),
  categoryAtom("cat-12", "Los homólogos se aparean en la profase I", "Meiosis", 9),
];

/** Átomos con `valor` para ¿Cuál es mayor? Solo se comparan los de la misma `etiqueta`. */
const valueAtom = (
  id: string,
  concepto: string,
  cantidad: number,
  unidad: string,
  etiqueta: string,
): Atom => ({
  id,
  concepto,
  definicion: `${concepto}: ${cantidad} ${unidad}`,
  confusiones: [],
  relacionados: [],
  valor: { cantidad, unidad, etiqueta },
  fuente: fuente(2, `${concepto}…`),
  semana: 5,
  dificultad: 2,
});

export const valuedAtoms: Atom[] = [
  valueAtom("val-1", "Fase G1", 11, "h", "duracion"),
  valueAtom("val-2", "Fase S", 8, "h", "duracion"),
  valueAtom("val-3", "Fase G2", 4, "h", "duracion"),
  valueAtom("val-4", "Mitosis (fase M)", 1, "h", "duracion"),
  valueAtom("val-5", "Interfase completa", 23, "h", "duracion"),
  valueAtom("val-6", "Célula somática humana", 46, "cromosomas", "cromosomas"),
  valueAtom("val-7", "Gameto humano", 23, "cromosomas", "cromosomas"),
  valueAtom("val-8", "Célula de perro", 78, "cromosomas", "cromosomas"),
  valueAtom("val-9", "Célula de mosca de la fruta", 8, "cromosomas", "cromosomas"),
  valueAtom("val-10", "Célula de papa", 48, "cromosomas", "cromosomas"),
  valueAtom("val-11", "Células hijas de la mitosis", 2, "células", "celulas"),
  valueAtom("val-12", "Células hijas de la meiosis", 4, "células", "celulas"),
];

/** Pregunta de ¿Cuál es mayor? según la `etiqueta` del valor. */
export const valueQuestions: Record<string, string> = {
  duracion: "¿Cuál dura más?",
  cromosomas: "¿Cuál tiene más cromosomas?",
  celulas: "¿Cuál produce más células?",
};

/** `ejemplos` para ¿Quién soy?, de la pista más vaga a la más clara. */
export const ejemplosPorAtomo: Record<string, string[]> = {
  "atom-mitosis": ["Gracias a mí sana un corte en la piel.", "Hago crecer a un bebé célula por célula."],
  "atom-meiosis": [
    "Sin mí no existirían los óvulos ni los espermatozoides.",
    "Ocurro en los testículos y ovarios.",
  ],
  "atom-interfase": ["Ocupo casi todo el tiempo de vida de una célula.", "Tengo tres etapas: G1, S y G2."],
  "atom-citocinesis": [
    "En las plantas formo una placa celular.",
    "En animales aparezco como un surco que estrangula.",
  ],
  "atom-crossing-over": ["Por mí no eres idéntico a tus hermanos.", "Formo quiasmas entre cromosomas."],
  "atom-huso": ["Me armo a partir de los centrosomas.", "Mis fibras se unen a los cinetocoros."],
  "atom-anafase": ["Soy la fase más corta de la división.", "Vengo justo después de la metafase."],
  "atom-homologos": ["Uno viene de tu mamá y otro de tu papá.", "En humanos somos 23 parejas."],
};

/** Conceptos de otra unidad (semana 3) para El intruso. */
export const otherUnitConcepts = [
  "Fotosíntesis",
  "Cloroplasto",
  "Respiración celular",
  "Glucólisis",
  "Clorofila",
];
