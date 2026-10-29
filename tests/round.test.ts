import { describe, expect, test } from "bun:test";
import { parseRoundQuery, roundMenuLabel, selectableRounds } from "../src/logic/round.ts";

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
