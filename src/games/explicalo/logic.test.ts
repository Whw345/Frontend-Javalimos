import { describe, expect, it } from "vitest";
import { canSubmit, clampText, isSubmitShortcut } from "./logic";

describe("Explícalo", () => {
  it("recorta al máximo de caracteres", () => {
    expect(clampText("abcdef", 4)).toBe("abcd");
    expect(clampText("abc", 4)).toBe("abc");
  });

  it("no permite enviar texto vacío", () => {
    expect(canSubmit("   ")).toBe(false);
    expect(canSubmit(" a ")).toBe(true);
  });

  it("Ctrl+Enter o ⌘+Enter envía; Enter solo no", () => {
    expect(isSubmitShortcut({ key: "Enter", ctrlKey: true, metaKey: false })).toBe(true);
    expect(isSubmitShortcut({ key: "Enter", ctrlKey: false, metaKey: true })).toBe(true);
    expect(isSubmitShortcut({ key: "Enter", ctrlKey: false, metaKey: false })).toBe(false);
  });
});
