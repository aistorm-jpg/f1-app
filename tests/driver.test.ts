import { describe, expect, test } from "bun:test";
import {
  ahead,
  headToHead,
  mapDriverCard,
  parseDriverQuery,
  pointBars,
  summarize,
  teammateId,
  type DriverCard,
} from "../src/logic/driver.ts";

function card(
  id: string,
  races: DriverCard["races"],
  qualifying: DriverCard["qualifying"],
): DriverCard {
  return { id, familyName: id, teamId: "ferrari", races, qualifying };
}

describe("kørerstatistik", () => {
  test("sejre, podier, udgåede og point", () => {
    expect(
      summarize([
        { round: 1, name: "a", position: 1, points: 25, teamId: "ferrari" },
        { round: 2, name: "b", position: 3, points: 15, teamId: "ferrari" },
        { round: 3, name: "c", position: null, points: 0, teamId: "ferrari" },
        { round: 4, name: "d", position: 6, points: 8, teamId: "ferrari" },
      ]),
    ).toEqual({ wins: 1, podiums: 2, dnfs: 1, points: 48 });
  });

  test("en klassificeret slår en udgået, og samme plads er uafgjort", () => {
    expect(ahead(2, 5)).toBe("a");
    expect(ahead(4, 1)).toBe("b");
    expect(ahead(3, 3)).toBe("tie");
    expect(ahead(null, 8)).toBe("b");
    expect(ahead(6, null)).toBe("a");
    expect(ahead(null, null)).toBe("tie");
  });

  test("holdkammerat tælles i kval, løb og point", () => {
    const driver = card(
      "hamilton",
      [
        { round: 1, name: "a", position: 1, points: 25, teamId: "ferrari" },
        { round: 2, name: "b", position: null, points: 0, teamId: "ferrari" },
        { round: 3, name: "c", position: 4, points: 12, teamId: "ferrari" },
      ],
      [
        { round: 1, position: 2 },
        { round: 2, position: 1 },
        { round: 3, position: 6 },
      ],
    );
    const teammate = card(
      "leclerc",
      [
        { round: 1, name: "a", position: 3, points: 15, teamId: "ferrari" },
        { round: 2, name: "b", position: 2, points: 18, teamId: "ferrari" },
        { round: 3, name: "c", position: 4, points: 12, teamId: "ferrari" },
      ],
      [
        { round: 1, position: 5 },
        { round: 2, position: 3 },
        { round: 3, position: 4 },
      ],
    );
    expect(headToHead(driver, teammate)).toEqual({
      quali: { driver: 2, teammate: 1 },
      race: { driver: 1, teammate: 1 },
      points: { driver: 37, teammate: 45 },
    });
  });

  test("holdkammeraten er den anden på samme hold", () => {
    const rows = [
      { id: "hamilton", teamId: "ferrari" },
      { id: "leclerc", teamId: "ferrari" },
      { id: "norris", teamId: "mclaren" },
    ];
    expect(teammateId(rows, "hamilton")).toBe("leclerc");
    expect(teammateId(rows, "norris")).toBeNull();
    expect(parseDriverQuery("Max_Verstappen")).toBe("max_verstappen");
    expect(parseDriverQuery("no pe")).toBeNull();
  });

  test("søjlen med flest point er den højeste", () => {
    const bars = pointBars([0, 10, 5], 100, 50);
    expect(bars[1]?.h).toBeGreaterThan(bars[2]?.h ?? 0);
    expect(bars[1]?.h).toBeGreaterThan(bars[0]?.h ?? 0);
    expect(bars[1]?.y).toBe(0);
    expect(bars[0]?.h).toBe(0);
  });

  test("udgået fra jolpica bliver en tom placering", () => {
    const mapped = mapDriverCard(
      "hamilton",
      {
        MRData: {
          RaceTable: {
            Races: [
              {
                round: "2",
                raceName: "B",
                Results: [
                  {
                    position: "1",
                    positionText: "1",
                    points: "25",
                    status: "Finished",
                    Driver: { familyName: "Hamilton" },
                    Constructor: { constructorId: "ferrari" },
                  },
                ],
              },
              {
                round: "1",
                raceName: "A",
                Results: [
                  {
                    positionText: "R",
                    points: "0",
                    status: "Retired",
                    Driver: { familyName: "Hamilton" },
                    Constructor: { constructorId: "ferrari" },
                  },
                ],
              },
            ],
          },
        },
      },
      {
        MRData: {
          RaceTable: {
            Races: [{ round: "1", QualifyingResults: [{ position: "3" }] }],
          },
        },
      },
    );
    expect(mapped.familyName).toBe("Hamilton");
    expect(mapped.races.map((race) => race.position)).toEqual([null, 1]);
    expect(mapped.qualifying).toEqual([{ round: 1, position: 3 }]);
  });
});
