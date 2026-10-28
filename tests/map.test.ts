import { describe, expect, test } from "bun:test";
import { mapDriverStandings, mapRace, mapRaceResults, sessionInstant } from "../src/data/map.ts";
import type { ApiDriverStandingsResponse, ApiRace, ApiResultsResponse } from "../src/data/types.ts";

const chinese: ApiRace = {
  season: "2026",
  round: "2",
  raceName: "Chinese Grand Prix",
  date: "2026-03-15",
  time: "07:00:00Z",
  Circuit: {
    circuitName: "Shanghai International Circuit",
    Location: { locality: "Shanghai", country: "China" },
  },
  FirstPractice: { date: "2026-03-13", time: "03:30:00Z" },
  SprintQualifying: { date: "2026-03-13", time: "07:30:00Z" },
  Sprint: { date: "2026-03-14", time: "03:00:00Z" },
  Qualifying: { date: "2026-03-14", time: "07:00:00Z" },
};

describe("Jolpica-data bliver til vores egne typer", () => {
  test("sessionstid sættes sammen til et UTC-tidspunkt", () => {
    expect(sessionInstant({ date: "2026-03-15", time: "07:00:00Z" })).toBe("2026-03-15T07:00:00Z");
    expect(sessionInstant({ date: "2026-03-15", time: "07:00:00" })).toBe("2026-03-15T07:00:00Z");
  });

  test("en sprint-weekend sorterer sessionerne og får et dansk navn", () => {
    const race = mapRace(chinese);
    expect(race.name).toBe("Kinas Grand Prix");
    expect(race.country).toBe("Kina");
    expect(race.sprintWeekend).toBe(true);
    expect(race.sessions.map((session) => session.kind)).toEqual([
      "practice1",
      "sprintQualifying",
      "sprint",
      "qualifying",
      "race",
    ]);
  });

  test("en kører med to teams beholder begge", () => {
    const payload: ApiDriverStandingsResponse = {
      MRData: {
        StandingsTable: {
          season: "2026",
          round: "18",
          StandingsLists: [
            {
              round: "18",
              DriverStandings: [
                {
                  position: "9",
                  points: "77",
                  wins: "0",
                  Driver: {
                    driverId: "lawson",
                    code: "LAW",
                    permanentNumber: "30",
                    givenName: "Liam",
                    familyName: "Lawson",
                  },
                  Constructors: [
                    { constructorId: "rb", name: "RB F1 Team" },
                    { constructorId: "red_bull", name: "Red Bull" },
                  ],
                },
              ],
            },
          ],
        },
      },
    };
    const table = mapDriverStandings(payload);
    expect(table.round).toBe(18);
    expect(table.rows[0]?.teams.map((team) => team.name)).toEqual(["RB F1 Team", "Red Bull"]);
    expect(table.rows[0]?.driver.code).toBe("LAW");
  });

  test("udgåede kørere har ingen tid, men en status", () => {
    const payload: ApiResultsResponse = {
      MRData: {
        RaceTable: {
          Races: [
            {
              round: "18",
              raceName: "United States Grand Prix",
              date: "2026-10-25",
              time: "20:00:00Z",
              Results: [
                {
                  position: "1",
                  points: "25",
                  grid: "1",
                  laps: "56",
                  status: "Finished",
                  Time: { time: "1:35:16.650" },
                  FastestLap: { rank: "1" },
                  Driver: {
                    driverId: "antonelli",
                    code: "ANT",
                    givenName: "Andrea Kimi",
                    familyName: "Antonelli",
                  },
                  Constructor: { constructorId: "mercedes", name: "Mercedes" },
                },
                {
                  position: "20",
                  points: "0",
                  grid: "0",
                  laps: "12",
                  status: "Retired",
                  Driver: {
                    driverId: "bottas",
                    code: "BOT",
                    givenName: "Valtteri",
                    familyName: "Bottas",
                  },
                  Constructor: { constructorId: "cadillac", name: "Cadillac" },
                },
              ],
            },
          ],
        },
      },
    };
    const rows = mapRaceResults(payload);
    expect(rows[0]?.time).toBe("1:35:16.650");
    expect(rows[0]?.fastestLapRank).toBe("1");
    expect(rows[1]?.time).toBeNull();
    expect(rows[1]?.status).toBe("Retired");
    expect(rows[1]?.grid).toBe(0);
  });
});
