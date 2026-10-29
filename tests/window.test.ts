import { describe, expect, test } from "bun:test";
import { activeSession, isSessionLive, qualifyingSegment } from "../src/logic/window.ts";

const start = "2026-11-01T20:00:00Z";

describe("hvornår en session er i gang", () => {
  test("et løb er live fra ti minutter før til to en halv time efter start", () => {
    expect(isSessionLive(start, "race", new Date("2026-11-01T19:49:00Z"))).toBe(false);
    expect(isSessionLive(start, "race", new Date("2026-11-01T19:50:00Z"))).toBe(true);
    expect(isSessionLive(start, "race", new Date("2026-11-01T22:30:00Z"))).toBe(true);
    expect(isSessionLive(start, "race", new Date("2026-11-01T22:31:00Z"))).toBe(false);
  });

  test("træning slutter tidligere end et løb", () => {
    expect(isSessionLive(start, "practice1", new Date("2026-11-01T21:15:00Z"))).toBe(false);
    expect(isSessionLive(start, "practice1", new Date("2026-11-01T21:00:00Z"))).toBe(true);
  });

  test("løbet vinder hvis det overlapper med en træning", () => {
    const chosen = activeSession(
      [
        { kind: "practice1" as const, start, label: "1. træning" },
        { kind: "race" as const, start, label: "løb" },
      ],
      new Date("2026-11-01T20:05:00Z"),
    );
    expect(chosen?.kind).toBe("race");
  });

  test("kvalens fase følger tiden efter start", () => {
    expect(qualifyingSegment(start, new Date("2026-11-01T20:10:00Z"))).toBe("Q1");
    expect(qualifyingSegment(start, new Date("2026-11-01T20:30:00Z"))).toBe("Q2");
    expect(qualifyingSegment(start, new Date("2026-11-01T21:00:00Z"))).toBe("Q3");
  });
});
