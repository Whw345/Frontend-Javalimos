import type { Template } from "./types";

export type TemplateDefinition = {
  label: string;
  description: string;
  bestFor: string[];
};

export const templateCatalog = {
  multiple_choice: {
    label: "Selección múltiple",
    description: "El estudiante elige una alternativa correcta entre varias opciones.",
    bestFor: ["definiciones", "conceptos", "relaciones causa-efecto", "aplicación breve"],
  },
  matching: {
    label: "Emparejar conceptos",
    description: "El estudiante relaciona conceptos con sus definiciones o ejemplos.",
    bestFor: ["vocabulario", "clasificaciones", "concepto-definición", "autor-aporte"],
  },
  ordering: {
    label: "Ordenar pasos",
    description: "El estudiante organiza elementos según una secuencia correcta.",
    bestFor: ["procesos", "procedimientos", "algoritmos", "etapas"],
  },
  fill_blank: {
    label: "Completar el enunciado",
    description: "El estudiante completa una frase con el término o valor adecuado.",
    bestFor: ["fórmulas", "definiciones", "datos", "terminología"],
  },
} satisfies Record<Template, TemplateDefinition>;

export const availableTemplates = Object.keys(templateCatalog) as Template[];
