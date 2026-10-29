import { describe, expect, test } from "bun:test";
import {
  FASTEST_LAP_POINT,
  awardSessionPoints,
  projectStandings,
  tablePoints,
} from "../src/logic/points.ts";

describe("point i 2026", () => {
  test("løb og sprint bruger de tabeller jolpica har vist i år", () => {
    expect(tablePoints("race", 1)).toBe(25);
    expect(tablePoints("race", 2)).toBe(18);
    expect(tablePoints("race", 10)).toBe(1);
    expect(tablePoints("race", 11)).toBe(0);
    expect(tablePoints("sprint", 1)).toBe(8);
    expect(tablePoints("sprint", 8)).toBe(1);
    expect(tablePoints("sprint", 9)).toBe(0);
  });

  test("hurtigste omgang giver ikke et ekstra point", () => {
    expect(FASTEST_LAP_POINT).toBe(0);
    const [withLap, without] = awardSessionPoints("race", [
      { driverId: "a", teamId: "ferrari", retired: false, fastestLap: true },
      { driverId: "b", teamId: "mercedes", retired: false, fastestLap: false },
    ]);
    expect(withLap?.points).toBe(25);
    expect(without?.points).toBe(18);
  });

  test("en udgået tager ikke en point-plads", () => {
    const awards = awardSessionPoints("race", [
      { driverId: "out", teamId: "haas", retired: true },
      { driverId: "win", teamId: "mercedes", retired: false },
      { driverId: "second", teamId: "ferrari", retired: false },
    ]);
    expect(awards.map((row) => row.points)).toEqual([0, 25, 18]);
  });

  test("sprint-point og løbs-point kan lægges oven i stillingen", () => {
    const sprint = awardSessionPoints("sprint", [
      { driverId: "b", teamId: "ferrari", retired: false },
      { driverId: "a", teamId: "mercedes", retired: true },
    ]);
    const race = awardSessionPoints("race", [
      { driverId: "b", teamId: "ferrari", retired: false },
      { driverId: "a", teamId: "mercedes", retired: false },
    ]);
    const projected = projectStandings(
      [
        { id: "a", points: 10, position: 1 },
        { id: "b", points: 8, position: 2 },
      ],
      [...sprint, ...race].map((row) => ({ id: row.driverId, points: row.points })),
    );
    expect(projected.map((row) => [row.id, row.points, row.change])).toEqual([
      ["b", 8 + 8 + 25, 1],
      ["a", 10 + 0 + 18, -1],
    ]);
  });

  test("konstruktørpoint er summen af kørernes point", () => {
    const awards = awardSessionPoints("race", [
      { driverId: "a", teamId: "mercedes", retired: false },
      { driverId: "b", teamId: "mercedes", retired: false },
      { driverId: "c", teamId: "ferrari", retired: true },
    ]);
    const projected = projectStandings(
      [
        { id: "ferrari", points: 40, position: 1 },
        { id: "mercedes", points: 30, position: 2 },
      ],
      awards.map((row) => ({ id: row.teamId, points: row.points })),
    );
    expect(projected[0]).toMatchObject({ id: "mercedes", points: 30 + 25 + 18, change: 1 });
    expect(projected[1]).toMatchObject({ id: "ferrari", points: 40, change: -1 });
  });
});
