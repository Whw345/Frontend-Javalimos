export type Template =
  | "multiple_choice"
  | "matching"
  | "ordering"
  | "fill_blank";

export type CognitiveSkill =
  | "recordar"
  | "comprender"
  | "aplicar"
  | "analizar";

export type DecisionResult = {
  schemaVersion: "1.0";
  source: {
    documentId?: string;
    topic: string;
    section?: string;
  };
  decision: {
    template: Template;
    difficulty: 1 | 2 | 3 | 4 | 5;
    cognitiveSkill: CognitiveSkill;
    confidence: number;
    reason: string;
  };
};
