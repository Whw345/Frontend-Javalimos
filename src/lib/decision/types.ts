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

export type ConfidenceLevel = "low" | "medium" | "high";

export type GameRecommendation = {
  rank: 1 | 2 | 3;
  template: Template;
  difficulty: 1 | 2 | 3;
  score: number;
  confidenceLevel: ConfidenceLevel;
  reason: string;
};

export type DecisionResult = {
  schemaVersion: "1.0";
  topicId: string;
  recommendations: [GameRecommendation, GameRecommendation, GameRecommendation];
};
