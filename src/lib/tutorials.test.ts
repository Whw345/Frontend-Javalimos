import { describe, expect, it } from "vitest";
import type { GameSlug } from "@/games/types";
import { gameTutorials } from "./tutorials";

const gameSlugs: GameSlug[] = [
  "desliza",
  "parejas",
  "ordena",
  "dos-cajas",
  "hueco",
  "encuentra-error",
  "quien-soy",
  "intruso",
  "cual-mayor",
];

describe("game tutorials", () => {
  it("has independent hardcoded content for every game", () => {
    for (const slug of gameSlugs) {
      const tutorial = gameTutorials[slug];

      expect(tutorial.title).toBeTruthy();
      expect(tutorial.description).toBeTruthy();
      expect(tutorial.example).toBeTruthy();
      expect(tutorial.steps.length).toBeGreaterThanOrEqual(3);
      expect(tutorial.steps.every((step) => step.trim().length > 0)).toBe(true);
    }
  });
});

