import { describe, expect, test } from "bun:test";
import {
  focusRound,
  parseRoundQuery,
  roundMenuLabel,
  selectableRounds,
} from "../src/logic/round.ts";

const rounds = [1, 12, 18];

describe("runde i adressen", () => {
  test("kun en runde der findes", () => {
    expect(parseRoundQuery("12", rounds)).toBe(12);
    expect(parseRoundQuery("08", [8, 18])).toBe(8);
    expect(parseRoundQuery("18", rounds)).toBe(18);
  });

  test("tom, ukendt eller skæv tekst bliver til ingenting", () => {
    expect(parseRoundQuery(null, rounds)).toBeNull();
    expect(parseRoundQuery("", rounds)).toBeNull();
    expect(parseRoundQuery("99", rounds)).toBeNull();
    expect(parseRoundQuery("0", rounds)).toBeNull();
    expect(parseRoundQuery("1a", rounds)).toBeNull();
    expect(parseRoundQuery("1.5", rounds)).toBeNull();
    expect(parseRoundQuery(" 12", rounds)).toBeNull();
    expect(parseRoundQuery("123", rounds)).toBeNull();
  });

  test("menuen viser kun runder der er kørt", () => {
    expect(selectableRounds([{ round: 1 }, { round: 2 }, { round: 3 }], 2)).toEqual([1, 2]);
    expect(selectableRounds([{ round: 3 }, { round: 1 }], 3)).toEqual([1, 3]);
    expect(selectableRounds([{ round: 1 }], 0)).toEqual([]);
  });

  test("etiketten er runde og kort banenavn", () => {
    expect(roundMenuLabel(18, "United States Grand Prix")).toBe("r18 · united states gp");
  });
});

const usa = {
  round: 18,
  raceStart: "2026-10-25T20:00:00Z",
  sessions: [{ start: "2026-10-23T17:30:00Z" }],
};
const mexico = {
  round: 19,
  raceStart: "2026-11-01T20:00:00Z",
  sessions: [{ start: "2026-10-30T18:30:00Z" }, { start: "2026-10-31T21:00:00Z" }],
};

describe("primær runde i weekenden", () => {
  test("før weekenden er seneste løb stadig det primære", () => {
    const focus = focusRound({
      weekends: [usa, mexico],
      now: new Date("2026-10-30T18:00:00Z"),
      qualiRounds: [18],
      raceRounds: [18],
    });
    expect(focus).toEqual({ round: 18, phase: "race-done" });
  });

  test("efter første træning er den nye runde primær, uden kval og løb", () => {
    const focus = focusRound({
      weekends: [usa, mexico],
      now: new Date("2026-10-30T19:00:00Z"),
      qualiRounds: [18],
      raceRounds: [18],
    });
    expect(focus).toEqual({ round: 19, phase: "opened" });
  });

  test("efter kvalifikation vises den nye kval, og løbet er ikke kørt", () => {
    const focus = focusRound({
      weekends: [usa, mexico],
      now: new Date("2026-11-01T08:00:00Z"),
      qualiRounds: [18, 19],
      raceRounds: [18],
    });
    expect(focus).toEqual({ round: 19, phase: "qualified" });
  });

  test("løbet er live, når det er startet og resultatet ikke er ude", () => {
    const focus = focusRound({
      weekends: [usa, mexico],
      now: new Date("2026-11-01T20:30:00Z"),
      qualiRounds: [18, 19],
      raceRounds: [18],
      liveRaceRound: 19,
    });
    expect(focus).toEqual({ round: 19, phase: "race-live" });
  });

  test("når løbet er færdigt, er den nye runde stadig den primære", () => {
    const focus = focusRound({
      weekends: [usa, mexico],
      now: new Date("2026-11-01T23:30:00Z"),
      qualiRounds: [18, 19],
      raceRounds: [18, 19],
    });
    expect(focus).toEqual({ round: 19, phase: "race-done" });
  });
});
