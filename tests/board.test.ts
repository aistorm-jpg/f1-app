import { describe, expect, test } from "bun:test";
import {
  countdownParts,
  fastestLap,
  gapText,
  lapToMs,
  pad2,
  placesDelta,
  pointsBar,
  raceShort,
  teamLabel,
} from "../src/logic/board.ts";

describe("søjler og stilling", () => {
  test("føringen fylder søjlen, og nul er kun prikker", () => {
    expect(pointsBar(200, 200, 10)).toEqual({ filled: "██████████", rest: "" });
    expect(pointsBar(0, 200, 10).rest).toBe("··········");
    expect(pointsBar(100, 200, 10).filled).toBe("█████");
  });

  test("bag føringen er negativt, og føringen er tom", () => {
    expect(gapText(365, 365)).toBe("");
    expect(gapText(242, 365)).toBe("-123");
  });

  test("pladser fra start", () => {
    expect(placesDelta(4, 2)).toEqual({ kind: "up", text: "▲2" });
    expect(placesDelta(2, 3)).toEqual({ kind: "down", text: "▼1" });
    expect(placesDelta(1, 1).text).toBe("·");
    expect(placesDelta(0, 5).kind).toBe("none");
  });

  test("hurtigste omgangstid", () => {
    expect(lapToMs("1:34.035")).toBe(94_035);
    expect(fastestLap(["1:35.390", "1:34.278", "1:34.035"])).toBe("1:34.035");
    expect(fastestLap([null, undefined, ""])).toBeNull();
  });

  test("navne og nedtælling", () => {
    expect(teamLabel("RB F1 Team")).toBe("racing bulls");
    expect(raceShort("United States Grand Prix")).toBe("united states gp");
    const parts = countdownParts("2026-10-29T14:03:00Z", new Date("2026-10-28T12:00:00Z"));
    expect(parts).toEqual({ days: 1, hours: 2, minutes: 3, seconds: 0, elapsed: false });
    expect(pad2(3)).toBe("03");
    expect(countdownParts("2026-10-01T00:00:00Z", new Date("2026-10-28T00:00:00Z"))).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      elapsed: true,
    });
  });

  test("sekunder tæller, så uret ikke ser frosset ud", () => {
    const now = new Date("2026-11-01T20:00:00Z");
    expect(countdownParts("2026-11-01T20:00:50Z", now)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 50,
      elapsed: false,
    });
    expect(countdownParts("2026-11-01T20:01:30Z", now)).toEqual({
      days: 0,
      hours: 0,
      minutes: 1,
      seconds: 30,
      elapsed: false,
    });
    expect(countdownParts("ikke-en-dato", now).seconds).toBe(0);
  });
});
