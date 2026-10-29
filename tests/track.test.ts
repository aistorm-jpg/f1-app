import { describe, expect, test } from "bun:test";
import circuits from "../src/data/circuits.json";
import { drawTrack } from "../src/logic/track.ts";

const tracks = circuits as Record<string, { coordinates: [number, number][] }>;

describe("banekort", () => {
  test("mexico har vandret startlangside og en lodret startstreg", () => {
    const drawing = drawTrack(tracks.rodriguez?.coordinates ?? []);
    expect(drawing).not.toBeNull();
    if (!drawing) return;
    const match = /M(-?\d+),(-?\d+) L(-?\d+),(-?\d+)/.exec(drawing.startLine);
    expect(match).not.toBeNull();
    if (!match) return;
    expect(Number(match[1])).toBe(Number(match[3]));
    expect(Math.abs(Number(match[2]) - Number(match[4]))).toBeGreaterThan(20);
    expect(drawing.outline.startsWith("M")).toBe(true);
    expect(drawing.outline.endsWith("Z")).toBe(true);
    expect(drawing.clockwise).toBe(true);
  });

  test("alle sæsonens baner kan tegnes", () => {
    for (const [id, track] of Object.entries(tracks)) {
      const drawing = drawTrack(track.coordinates);
      expect(drawing, id).not.toBeNull();
      expect(drawing?.viewBox.startsWith("0 0")).toBe(true);
    }
  });
});
