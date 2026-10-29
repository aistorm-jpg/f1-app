import { describe, expect, test } from "bun:test";
import {
  copenhagenOffsetMinutes,
  formatDanishClock,
  formatDanishDay,
  formatFetchedAt,
} from "../src/logic/time.ts";

describe("dansk tid", () => {
  test("før sommertid er klokken 05:00", () => {
    const instant = new Date("2026-03-08T04:00:00Z");
    expect(formatDanishClock(instant.toISOString())).toBe("05:00");
    expect(copenhagenOffsetMinutes(instant)).toBe(60);
  });

  test("efter skiftet til sommertid er klokken 07:00", () => {
    const instant = new Date("2026-03-29T05:00:00Z");
    expect(formatDanishClock(instant.toISOString())).toBe("07:00");
    expect(copenhagenOffsetMinutes(instant)).toBe(120);
  });

  test("natten uret stilles tilbage, har to tidspunkter samme klokkeslæt og forskellig offset", () => {
    const before = new Date("2026-10-25T00:30:00Z");
    const after = new Date("2026-10-25T01:30:00Z");
    expect(formatDanishClock(before.toISOString())).toBe("02:30");
    expect(formatDanishClock(after.toISOString())).toBe("02:30");
    expect(copenhagenOffsetMinutes(before)).toBe(120);
    expect(copenhagenOffsetMinutes(after)).toBe(60);
  });

  test("USA og Mexico er kl. 21:00 dansk tid", () => {
    expect(formatDanishClock("2026-10-25T20:00:00Z")).toBe("21:00");
    expect(formatDanishClock("2026-11-01T20:00:00Z")).toBe("21:00");
    expect(formatDanishDay("2026-11-01T20:00:00Z")).toBe("søn  1 nov");
  });

  test("hentet-tidspunkt", () => {
    expect(formatFetchedAt(new Date("2026-10-28T19:45:00Z"))).toBe("28 okt 20:45");
  });
});
