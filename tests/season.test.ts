import { describe, expect, test } from "bun:test";
import {
  annotateRaces,
  countdownParts,
  latestStartedRound,
  pad2,
  pickFeatured,
  pointsRatio,
  racePhase,
} from "../src/logic/season.ts";

const races = [
  { round: 18, start: "2026-10-25T20:00:00Z" },
  { round: 19, start: "2026-11-01T20:00:00Z" },
  { round: 20, start: "2026-11-08T17:00:00Z" },
];

describe("løbets fase", () => {
  test("28. oktober er USA kørt, og Mexico er det næste", () => {
    const now = new Date("2026-10-28T12:00:00Z");
    const annotated = annotateRaces(races, now);
    expect(annotated.map((race) => [race.round, race.phase])).toEqual([
      [18, "completed"],
      [19, "next"],
      [20, "upcoming"],
    ]);
    expect(pickFeatured(annotated)?.phase).toBe("next");
    expect(latestStartedRound(races, now)).toBe(18);
  });

  test("et løb i gang skjuler ikke de andre, men der er kun ét highlight", () => {
    const now = new Date("2026-10-25T21:00:00Z");
    expect(racePhase(races[0]?.start ?? "", now)).toBe("live");
    const annotated = annotateRaces(races, now);
    expect(annotated.find((race) => race.round === 18)?.phase).toBe("live");
    expect(annotated.some((race) => race.phase === "next")).toBe(false);
    expect(pickFeatured(annotated)?.race.round).toBe(18);
  });

  test("før sæsonen er der intet kørt løb", () => {
    expect(latestStartedRound(races, new Date("2026-01-01T00:00:00Z"))).toBeNull();
    expect(pickFeatured(annotateRaces(races, new Date("2026-01-01T00:00:00Z")))?.phase).toBe(
      "next",
    );
  });

  test("når alt er kørt, er sæsonen slut", () => {
    const featured = pickFeatured(annotateRaces(races, new Date("2026-12-20T00:00:00Z")));
    expect(featured?.phase).toBe("season-over");
    expect(featured?.race.round).toBe(20);
  });
});

describe("point og nedtælling", () => {
  test("søjlen måles mod føringen og klemmer sig mellem 0 og 1", () => {
    expect(pointsRatio(50, 100)).toBe(0.5);
    expect(pointsRatio(100, 100)).toBe(1);
    expect(pointsRatio(0, 100)).toBe(0);
    expect(pointsRatio(10, 0)).toBe(0);
    expect(pointsRatio(-5, 100)).toBe(0);
    expect(pointsRatio(150, 100)).toBe(1);
  });

  test("nedtælling deler et tidsrum op i dage, timer, minutter og sekunder", () => {
    const now = new Date("2026-10-28T12:00:00Z");
    const parts = countdownParts("2026-10-29T14:03:04Z", now);
    expect(parts).toMatchObject({ days: 1, hours: 2, minutes: 3, seconds: 4, elapsed: false });
    expect(pad2(parts.hours)).toBe("02");
  });

  test("en passeret start er udløbet", () => {
    const parts = countdownParts("2026-10-01T00:00:00Z", new Date("2026-10-28T00:00:00Z"));
    expect(parts.elapsed).toBe(true);
    expect(parts.days).toBe(27);
  });
});
