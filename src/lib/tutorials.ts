import type { GameSlug } from "@/games/types";

export interface GameTutorial {
  title: string;
  description: string;
  example: string;
  steps: readonly string[];
}

/**
 * Contenido fijo para enseñar la mecánica antes de crear una sesión real.
 * No depende del Markdown, del proveedor LLM ni del payload generado.
 */
export const gameTutorials: Record<GameSlug, GameTutorial> = {
  desliza: {
    title: "Desliza",
    description: "Relaciona cada concepto con la definición que le corresponde.",
    example: "Desliza “Mitosis” hasta “División celular que produce dos células iguales”.",
    steps: ["Lee el concepto de la tarjeta.", "Desliza la tarjeta hacia su definición.", "Revisa tu selección y continúa con la siguiente."] ,
  },
  parejas: {
    title: "Parejas",
    description: "Encuentra las tarjetas que forman una pareja correcta.",
    example: "“Fotosíntesis” forma pareja con “Producción de glucosa usando luz”.",
    steps: ["Voltea una tarjeta.", "Voltea otra tarjeta para buscar su pareja.", "Conserva las parejas correctas y sigue jugando."] ,
  },
  ordena: {
    title: "Ordena",
    description: "Organiza los pasos de un proceso en el orden correcto.",
    example: "En un proceso celular, arrastra cada etapa desde el inicio hasta el final.",
    steps: ["Lee todas las tarjetas.", "Arrastra una tarjeta a la posición correcta.", "Comprueba que el proceso tenga sentido completo."] ,
  },
  "dos-cajas": {
    title: "Dos cajas",
    description: "Clasifica cada elemento en la categoría que corresponde.",
    example: "Coloca “Mitosis” en la caja “División celular” y no en “Intercambio genético”.",
    steps: ["Lee la tarjeta.", "Elige la caja que representa su categoría.", "Continúa hasta clasificar todas las tarjetas."] ,
  },
  hueco: {
    title: "Completa el hueco",
    description: "Completa una oración usando el concepto que falta.",
    example: "La ________ transforma la energía luminosa en energía química.",
    steps: ["Lee la oración completa.", "Elige el concepto que falta.", "Comprueba que la oración conserve su significado."] ,
  },
  "encuentra-error": {
    title: "Encuentra el error",
    description: "Detecta el fragmento que contiene una afirmación incorrecta.",
    example: "En una explicación sobre células, marca la frase que contradice el contenido.",
    steps: ["Lee todo el texto.", "Busca la afirmación que no coincide con el tema.", "Selecciona el fragmento incorrecto."] ,
  },
  "quien-soy": {
    title: "¿Quién soy?",
    description: "Descubre el concepto a partir de pistas progresivas.",
    example: "Pista: “Participo en la producción de energía celular”. Responde solo cuando estés seguro.",
    steps: ["Lee la primera pista.", "Pide o revisa la siguiente pista si la necesitas.", "Escribe o selecciona el concepto correcto."] ,
  },
  intruso: {
    title: "El intruso",
    description: "Encuentra el elemento que no pertenece al grupo.",
    example: "Entre conceptos de división celular, identifica el que pertenece a otro proceso.",
    steps: ["Lee todos los elementos.", "Busca la característica común del grupo.", "Selecciona el elemento diferente."] ,
  },
  "cual-mayor": {
    title: "¿Cuál es mayor?",
    description: "Compara dos alternativas y elige la que cumple la condición.",
    example: "Compara dos cantidades o propiedades y elige cuál tiene el valor mayor.",
    steps: ["Lee la comparación.", "Analiza las dos alternativas.", "Elige tu respuesta antes de que termine el tiempo."] ,
  },
};

