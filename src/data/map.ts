import type {
  ConstructorRow,
  DriverRow,
  QualifyingRow,
  RaceResult,
  RaceResultRow,
  RaceWeekend,
  Session,
} from "./types.ts";

interface ApiSession {
  date: string;
  time?: string;
}

interface ApiDriver {
  code?: string;
  familyName: string;
}

interface ApiTeam {
  constructorId: string;
  name: string;
}

interface ApiRace {
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: { circuitId: string; circuitName: string };
  FirstPractice?: ApiSession;
  SecondPractice?: ApiSession;
  ThirdPractice?: ApiSession;
  SprintQualifying?: ApiSession;
  Sprint?: ApiSession;
  Qualifying?: ApiSession;
}

const SESSION_FIELDS: Array<[keyof ApiRace, string, boolean]> = [
  ["FirstPractice", "1. træning", false],
  ["SecondPractice", "2. træning", false],
  ["ThirdPractice", "3. træning", false],
  ["SprintQualifying", "sprint-kval.", false],
  ["Sprint", "sprint", false],
  ["Qualifying", "kvalifikation", false],
];

export function sessionInstant(session: ApiSession): string | null {
  if (!session.date) return null;
  if (!session.time) return `${session.date}T00:00:00Z`;
  const time = session.time.endsWith("Z") ? session.time : `${session.time}Z`;
  return `${session.date}T${time}`;
}

function numberValue(value: string | number | undefined, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function mapWeekend(race: ApiRace): RaceWeekend {
  const sessions: Session[] = [];
  for (const [field, label, isRace] of SESSION_FIELDS) {
    const raw = race[field];
    if (!raw || typeof raw !== "object" || !("date" in raw)) continue;
    const start = sessionInstant(raw);
    if (start) sessions.push({ label, start, race: isRace });
  }
  const raceStart = sessionInstant({ date: race.date, time: race.time }) ?? "";
  if (raceStart) sessions.push({ label: "løb", start: raceStart, race: true });
  sessions.sort((a, b) => a.start.localeCompare(b.start));
  return {
    round: numberValue(race.round),
    name: race.raceName,
    circuitId: race.Circuit.circuitId,
    circuitName: race.Circuit.circuitName,
    raceStart,
    sessions,
  };
}

export function mapSchedule(payload: {
  MRData?: { RaceTable?: { Races?: ApiRace[] } };
}): RaceWeekend[] {
  const races = payload.MRData?.RaceTable?.Races;
  if (!Array.isArray(races)) throw new Error("Uventet svar fra Jolpica");
  return races
    .map(mapWeekend)
    .filter((race) => race.round > 0 && race.raceStart)
    .sort((a, b) => a.round - b.round);
}

export function mapDrivers(payload: {
  MRData?: {
    StandingsTable?: {
      round?: string;
      StandingsLists?: Array<{
        round?: string;
        DriverStandings?: Array<{
          position: string;
          points: string;
          Driver: ApiDriver;
          Constructors?: ApiTeam[];
        }>;
      }>;
    };
  };
}): { round: number; rows: DriverRow[] } {
  const table = payload.MRData?.StandingsTable;
  const list = table?.StandingsLists?.[0];
  return {
    round: numberValue(list?.round ?? table?.round),
    rows: (list?.DriverStandings ?? []).map((row) => ({
      position: numberValue(row.position),
      familyName: row.Driver.familyName,
      points: numberValue(row.points),
      teamId: row.Constructors?.[0]?.constructorId ?? "",
    })),
  };
}

export function mapConstructors(payload: {
  MRData?: {
    StandingsTable?: {
      round?: string;
      StandingsLists?: Array<{
        round?: string;
        ConstructorStandings?: Array<{
          position: string;
          points: string;
          Constructor: ApiTeam;
        }>;
      }>;
    };
  };
}): { round: number; rows: ConstructorRow[] } {
  const table = payload.MRData?.StandingsTable;
  const list = table?.StandingsLists?.[0];
  return {
    round: numberValue(list?.round ?? table?.round),
    rows: (list?.ConstructorStandings ?? []).map((row) => ({
      position: numberValue(row.position),
      name: row.Constructor.name,
      points: numberValue(row.points),
      teamId: row.Constructor.constructorId,
    })),
  };
}

interface ApiResult {
  position: string;
  positionText?: string;
  points: string;
  grid?: string;
  laps?: string;
  status: string;
  Time?: { time?: string };
  FastestLap?: { rank?: string };
  Driver: ApiDriver & { code?: string };
  Constructor: ApiTeam;
}

interface ApiQuali {
  position: string;
  Driver: ApiDriver;
  Constructor: ApiTeam;
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

function firstRace<T>(payload: { MRData?: { RaceTable?: { Races?: T[] } } }): T | null {
  const races = payload.MRData?.RaceTable?.Races;
  if (!Array.isArray(races)) throw new Error("Uventet svar fra Jolpica");
  return races[0] ?? null;
}

export function mapQualifying(payload: {
  MRData?: { RaceTable?: { Races?: Array<{ QualifyingResults?: ApiQuali[] }> } };
}): QualifyingRow[] {
  const rows = firstRace(payload)?.QualifyingResults ?? [];
  return rows.map((row) => ({
    position: numberValue(row.position),
    familyName: row.Driver.familyName,
    teamId: row.Constructor.constructorId,
    q1: row.Q1 ?? null,
    q2: row.Q2 ?? null,
    q3: row.Q3 ?? null,
  }));
}

export function mapRaceResult(payload: {
  MRData?: {
    RaceTable?: {
      Races?: Array<{
        round?: string;
        raceName?: string;
        Results?: ApiResult[];
      }>;
    };
  };
}): RaceResult | null {
  const race = firstRace(payload);
  const results = race?.Results;
  if (!race || !results?.length) return null;
  const rows: RaceResultRow[] = results.map((row) => {
    const retired = row.positionText === "R" || row.status === "Retired";
    return {
      position: retired ? null : numberValue(row.position),
      familyName: row.Driver.familyName,
      teamId: row.Constructor.constructorId,
      grid: numberValue(row.grid),
      laps: numberValue(row.laps),
      status: row.status,
      time: row.Time?.time ?? null,
      points: numberValue(row.points),
      fastestLap: row.FastestLap?.rank === "1",
    };
  });
  const podium = results.slice(0, 3).map((row) => ({
    code: row.Driver.code ?? row.Driver.familyName.slice(0, 3).toUpperCase(),
    teamId: row.Constructor.constructorId,
    teamName: row.Constructor.name,
  }));
  return {
    round: numberValue(race.round),
    name: race.raceName ?? "",
    laps: rows[0]?.laps ?? 0,
    rows,
    podium,
  };
}
