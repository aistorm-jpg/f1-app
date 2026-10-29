import { describe, expect, test } from "bun:test";
import { copy, lapUnit, parseLang, resolveLang, sessionName } from "../src/logic/i18n.ts";

describe("sprog", () => {
  test("dansk og engelsk har de samme nøgler", () => {
    const danish = Object.keys(copy.da).sort();
    const english = Object.keys(copy.en).sort();
    expect(english).toEqual(danish);
    for (const key of danish) {
      expect(copy.da[key as keyof typeof copy.da].length).toBeGreaterThan(0);
      expect(copy.en[key as keyof typeof copy.en].length).toBeGreaterThan(0);
    }
  });

  test("adressen vinder over det gemte sprog", () => {
    expect(parseLang("en")).toBe("en");
    expect(parseLang("da")).toBe("da");
    expect(parseLang("fr")).toBeNull();
    expect(parseLang(null)).toBeNull();
    expect(resolveLang("en", "da")).toBe("en");
    expect(resolveLang(null, "en")).toBe("en");
    expect(resolveLang("nope", null)).toBe("da");
    expect(resolveLang(null, null)).toBe("da");
  });

  test("sessioner og omgange", () => {
    expect(sessionName(copy.da, "practice1")).toBe("1. træning");
    expect(sessionName(copy.en, "practice1")).toBe("fp1");
    expect(sessionName(copy.en, "qualifying")).toBe("qualifying");
    expect(sessionName(copy.en, "race")).toBe("race");
    expect(lapUnit(copy.da, 1)).toBe("omg.");
    expect(lapUnit(copy.da, 2)).toBe("omg.");
    expect(lapUnit(copy.en, 1)).toBe("lap");
    expect(lapUnit(copy.en, 2)).toBe("laps");
  });
});
