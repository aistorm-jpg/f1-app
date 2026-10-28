import { countryName, raceDisplayName } from "../logic/labels.ts";
import type {
  ApiDriver,
  ApiQualifyingResult,
  ApiRace,
  ApiResult,
  ApiResultsResponse,
  ApiScheduleResponse,
  ApiSession,
  ApiTeam,
  ConstructorStanding,
  DriverStanding,
  LatestWinner,
  QualifyingRow,
  Race,
  ResultRow,
  Session,
  SessionKind,
  StandingsTable,
  Team,
  Person,
  ApiDriverStandingsResponse,
  ApiConstructorStandingsResponse,
} from "./types.ts";

const SESSION_FIELDS: Array<[keyof ApiRace, SessionKind]> = [
  ["FirstPractice", "practice1"],
  ["SecondPractice", "practice2"],
  ["ThirdPractice", "practice3"],
  ["SprintQualifying", "sprintQualifying"],
  ["Sprint", "sprint"],
  ["Qualifying", "qualifying"],
];

export function sessionInstant(session: ApiSession): string | null {
  if (!session.date) return null;
  if (!session.time) return `${session.date}T00:00:00Z`;
  const time = session.time.endsWith("Z") ? session.time : `${session.time}Z`;
  return `${session.date}T${time}`;
}

function numberValue(value: string | undefined, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function personFrom(driver: ApiDriver): Person {
  const code = driver.code?.trim() || driver.familyName.slice(0, 3).toUpperCase();
  return {
    id: driver.driverId,
    code,
    number: driver.permanentNumber ?? "",
    givenName: driver.givenName,
    familyName: driver.familyName,
  };
}

function teamFrom(team: ApiTeam): Team {
  return { id: team.constructorId, name: team.name };
}

export function mapRace(race: ApiRace): Race {
  const sessions: Session[] = [];
  for (const [field, kind] of SESSION_FIELDS) {
    const raw = race[field];
    if (!raw || typeof raw !== "object" || !("date" in raw)) continue;
    const start = sessionInstant(raw);
    if (start) sessions.push({ kind, start });
  }
  const raceStart = sessionInstant({ date: race.date, time: race.time });
  if (raceStart) sessions.push({ kind: "race", start: raceStart });
  sessions.sort((a, b) => a.start.localeCompare(b.start));

  return {
    season: race.season,
    round: numberValue(race.round),
    officialName: race.raceName,
    name: raceDisplayName(race.raceName),
    circuit: race.Circuit.circuitName,
    locality: race.Circuit.Location.locality,
    country: countryName(race.Circuit.Location.country),
    sprintWeekend: sessions.some(
      (session) => session.kind === "sprint" || session.kind === "sprintQualifying",
    ),
    sessions,
  };
}

export function mapSchedule(payload: ApiScheduleResponse): Race[] {
  const races = payload.MRData?.RaceTable?.Races;
  if (!Array.isArray(races)) throw new Error("Uventet svar fra Jolpica");
  return races
    .map(mapRace)
    .filter((race) => race.round > 0)
    .sort((a, b) => a.round - b.round);
}

function emptyStandings(season: string, round: number): StandingsTable<never> {
  return { season, round, rows: [] };
}

export function mapDriverStandings(
  payload: ApiDriverStandingsResponse,
): StandingsTable<DriverStanding> {
  const table = payload.MRData?.StandingsTable;
  const list = table?.StandingsLists?.[0];
  if (!table || !list?.DriverStandings) {
    return emptyStandings(table?.season ?? "", numberValue(table?.round));
  }
  return {
    season: list.season ?? table.season ?? "",
    round: numberValue(list.round ?? table.round),
    rows: list.DriverStandings.map((row) => ({
      position: numberValue(row.position),
      points: numberValue(row.points),
      wins: numberValue(row.wins),
      driver: personFrom(row.Driver),
      teams: (row.Constructors ?? []).map(teamFrom),
    })),
  };
}

export function mapConstructorStandings(
  payload: ApiConstructorStandingsResponse,
): StandingsTable<ConstructorStanding> {
  const table = payload.MRData?.StandingsTable;
  const list = table?.StandingsLists?.[0];
  if (!table || !list?.ConstructorStandings) {
    return emptyStandings(table?.season ?? "", numberValue(table?.round));
  }
  return {
    season: list.season ?? table.season ?? "",
    round: numberValue(list.round ?? table.round),
    rows: list.ConstructorStandings.map((row) => ({
      position: numberValue(row.position),
      points: numberValue(row.points),
      wins: numberValue(row.wins),
      team: teamFrom(row.Constructor),
    })),
  };
}

function firstRace(payload: ApiResultsResponse) {
  const races = payload.MRData?.RaceTable?.Races;
  if (!Array.isArray(races)) throw new Error("Uventet svar fra Jolpica");
  return races[0] ?? null;
}

function mapResult(row: ApiResult): ResultRow {
  return {
    position: numberValue(row.position),
    points: numberValue(row.points),
    grid: numberValue(row.grid),
    laps: numberValue(row.laps),
    status: row.status,
    time: row.Time?.time ?? null,
    fastestLapRank: row.FastestLap?.rank ?? null,
    driver: personFrom(row.Driver),
    team: teamFrom(row.Constructor),
  };
}

function mapQualiRow(row: ApiQualifyingResult): QualifyingRow {
  return {
    position: numberValue(row.position),
    driver: personFrom(row.Driver),
    team: teamFrom(row.Constructor),
    q1: row.Q1 ?? null,
    q2: row.Q2 ?? null,
    q3: row.Q3 ?? null,
  };
}

export function mapRaceResults(payload: ApiResultsResponse): ResultRow[] {
  return (firstRace(payload)?.Results ?? []).map(mapResult);
}

export function mapSprintResults(payload: ApiResultsResponse): ResultRow[] {
  return (firstRace(payload)?.SprintResults ?? []).map(mapResult);
}

export function mapQualifying(payload: ApiResultsResponse): QualifyingRow[] {
  return (firstRace(payload)?.QualifyingResults ?? []).map(mapQualiRow);
}

export function mapLatestWinner(payload: ApiResultsResponse): LatestWinner | null {
  const race = firstRace(payload);
  const winner = race?.Results?.[0];
  if (!race || !winner) return null;
  return {
    round: numberValue(race.round),
    raceName: raceDisplayName(race.raceName ?? ""),
    date: sessionInstant({ date: race.date ?? "", time: race.time }) ?? "",
    driver: personFrom(winner.Driver),
    team: teamFrom(winner.Constructor),
    time: winner.Time?.time ?? null,
    points: numberValue(winner.points),
  };
}
