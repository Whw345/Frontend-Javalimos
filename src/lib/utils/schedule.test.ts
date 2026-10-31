import { describe, expect, it } from "vitest";
import { difficultyForWeek, firstMonday, formatDeadline, weekWindow } from "./schedule";

describe("course schedule", () => {
  it("starts on the next Monday in Lima, or today when it is already Monday there", () => {
    // Viernes 30/10/2026, 22:37 en Lima (ya es sábado en UTC).
    expect(firstMonday(new Date("2026-10-31T03:37:00Z"))).toBe("2026-11-02");
    // Lunes en Lima a las 23:00: en UTC ya es martes.
    expect(firstMonday(new Date("2026-11-03T04:00:00Z"))).toBe("2026-11-02");
    // Lunes a las 00:00 en Lima.
    expect(firstMonday(new Date("2026-11-02T05:00:00Z"))).toBe("2026-11-02");
    // Domingo a las 23:59 en Lima.
    expect(firstMonday(new Date("2026-11-02T04:59:00Z"))).toBe("2026-11-02");
    // Martes en Lima: espera al lunes siguiente.
    expect(firstMonday(new Date("2026-11-03T05:00:00Z"))).toBe("2026-11-09");
  });

  it("opens every week on Monday at 00:00 and closes it when the next one starts", () => {
    expect(weekWindow("2026-11-02", 1)).toEqual({
      opensAt: "2026-11-02T05:00:00.000Z",
      deadline: "2026-11-09T05:00:00.000Z",
    });
    expect(weekWindow("2026-11-02", 3).deadline).toBe("2026-11-23T05:00:00.000Z");
  });

  it("raises the difficulty along the course", () => {
    const weeks = [1, 2, 3, 4, 5, 6];
    expect(weeks.map((week) => difficultyForWeek(week, weeks))).toEqual([1, 1, 2, 2, 3, 3]);
    expect(difficultyForWeek(7, [7])).toBe(1);
  });

  it("shows deadlines in Lima time", () => {
    expect(formatDeadline("2026-11-09T05:00:00.000Z")).toBe("lun 9 nov, 00:00");
  });
});
