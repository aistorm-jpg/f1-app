import { describe, expect, test } from "bun:test";
import {
  copenhagenOffsetMinutes,
  formatDanishClock,
  formatDanishDateTime,
} from "../src/logic/time.ts";

describe("dansk tid i Europe/Copenhagen", () => {
  test("før sommertid: Australien 8. marts 2026 er kl. 05.00", () => {
    const instant = new Date("2026-03-08T04:00:00Z");
    expect(formatDanishClock(instant.toISOString())).toBe("05.00");
    expect(copenhagenOffsetMinutes(instant)).toBe(60);
  });

  test("efter skiftet til sommertid: Japan 29. marts 2026 er kl. 07.00", () => {
    const instant = new Date("2026-03-29T05:00:00Z");
    expect(formatDanishClock(instant.toISOString())).toBe("07.00");
    expect(copenhagenOffsetMinutes(instant)).toBe(120);
  });

  test("midt i sommeren: Storbritannien 5. juli 2026 er kl. 16.00", () => {
    const instant = new Date("2026-07-05T14:00:00Z");
    expect(formatDanishClock(instant.toISOString())).toBe("16.00");
    expect(copenhagenOffsetMinutes(instant)).toBe(120);
  });

  test("natten hvor uret stilles tilbage, har to klokkeslæt 02.30 forskellig offset", () => {
    const before = new Date("2026-10-25T00:30:00Z");
    const after = new Date("2026-10-25T01:30:00Z");
    expect(formatDanishClock(before.toISOString())).toBe("02.30");
    expect(formatDanishClock(after.toISOString())).toBe("02.30");
    expect(copenhagenOffsetMinutes(before)).toBe(120);
    expect(copenhagenOffsetMinutes(after)).toBe(60);
  });

  test("efter vintertid: USA 25. oktober og Mexico 1. november er kl. 21.00", () => {
    expect(formatDanishClock("2026-10-25T20:00:00Z")).toBe("21.00");
    expect(copenhagenOffsetMinutes(new Date("2026-10-25T20:00:00Z"))).toBe(60);
    expect(formatDanishDateTime("2026-11-01T20:00:00Z")).toContain("kl. 21.00");
  });

  test("ugyldigt tidspunkt bliver en tankestreg", () => {
    expect(formatDanishClock("ikke-en-dato")).toBe("–");
    expect(formatDanishDateTime("ikke-en-dato")).toBe("–");
  });
});
