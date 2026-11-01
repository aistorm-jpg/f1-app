import { SEASON } from "../config.ts";
import { weekendOpensAt } from "../logic/round.ts";
import { loadCachedEntry, type KeyValueStore } from "./cache.ts";
import { mapConstructors, mapDrivers, mapQualifying, mapRaceResult, mapSchedule } from "./map.ts";
import type { ConstructorRow, DriverRow, QualifyingRow, RaceResult, RaceWeekend } from "./types.ts";

const BASE = "https://api.jolpi.ca/ergast/f1";
const PREFIX = "apex.v2";

export const CACHE_TTL = {
  scheduleMs: 6 * 60 * 60 * 1000,
  standingsMs: 5 * 60 * 1000,
  resultsMs: 5 * 60 * 1000,
  /** Tom kval eller et løb uden resultat. Kort, så weekenden ikke sidder fast. */
  emptyMs: 30 * 1000,
} as const;

export interface RacePending {
  round: number;
  name: string;
  raceStart: string;
}

export interface BoardData {
  weekends: RaceWeekend[];
  drivers: { round: number; rows: DriverRow[] };
  constructors: { round: number; rows: ConstructorRow[] };
  /** Runden siden viser, når adressen ikke vælger en anden. */
  focusRound: number;
  qualiRound: number;
  qualiName: string;
  qualifying: QualifyingRow[];
  result: RaceResult | null;
  racePending: RacePending | null;
  /** Seneste færdigkørte løb. Podiet bruger den, også mens næste løb venter. */
  lastResult: RaceResult | null;
  fetchedAt: number;
}

function browserStore(): KeyValueStore | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const probe = `${PREFIX}.probe`;
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}/${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Jolpica svarede ${response.status}`);
  return (await response.json()) as T;
}

function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
  isEmpty?: (data: T) => boolean,
) {
  return loadCachedEntry({
    store: browserStore(),
    key: `${PREFIX}.${SEASON}.${key}`,
    ttlMs,
    emptyTtlMs: isEmpty ? CACHE_TTL.emptyMs : undefined,
    isEmpty,
    load,
  });
}

async function qualiOrEmpty(round: number): Promise<QualifyingRow[]> {
  try {
    return mapQualifying(await getJson(`${SEASON}/${round}/qualifying.json?limit=100`));
  } catch {
    return [];
  }
}

async function raceOrNull(round: number): Promise<RaceResult | null> {
  try {
    return mapRaceResult(await getJson(`${SEASON}/${round}/results.json?limit=100`));
  } catch {
    return null;
  }
}

export async function loadBoard(options?: { fresh?: boolean }): Promise<BoardData> {
  const standingsTtl = options?.fresh ? 0 : CACHE_TTL.standingsMs;
  const resultsTtl = options?.fresh ? 0 : CACHE_TTL.resultsMs;
  const [weekends, drivers, constructors, result] = await Promise.all([
    cached("schedule", CACHE_TTL.scheduleMs, async () =>
      mapSchedule(await getJson(`${SEASON}.json?limit=100`)),
    ),
    cached("drivers", standingsTtl, async () =>
      mapDrivers(await getJson(`${SEASON}/driverStandings.json?limit=100`)),
    ),
    cached("constructors", standingsTtl, async () =>
      mapConstructors(await getJson(`${SEASON}/constructorStandings.json?limit=100`)),
    ),
    cached("last-result", resultsTtl, async () =>
      mapRaceResult(await getJson(`${SEASON}/last/results.json?limit=100`)),
    ),
  ]);

  const lastRound = result.data?.round ?? 0;
  const next = weekends.data.find((weekend) => weekend.round > lastRound) ?? null;
  const weekendOpen = Boolean(next && new Date(weekendOpensAt(next)).getTime() <= Date.now());
  const focusRound = weekendOpen && next ? next.round : lastRound;

  const qualiSource = focusRound > 0 ? focusRound : 0;
  const qualifying =
    qualiSource > 0
      ? await cached(
          `qualifying-${qualiSource}`,
          resultsTtl,
          () => qualiOrEmpty(qualiSource),
          (rows) => rows.length === 0,
        )
      : { data: [] as QualifyingRow[], savedAt: result.savedAt };

  let raceResult = result.data;
  let racePending: RacePending | null = null;
  if (weekendOpen && next) {
    const race = await cached(
      `result-${next.round}`,
      resultsTtl,
      () => raceOrNull(next.round),
      (data) => data == null,
    );
    if (race.data) raceResult = race.data;
    else {
      raceResult = null;
      racePending = { round: next.round, name: next.name, raceStart: next.raceStart };
    }
  }

  const qualiName =
    weekends.data.find((weekend) => weekend.round === qualiSource)?.name ?? result.data?.name ?? "";

  return {
    weekends: weekends.data,
    drivers: drivers.data,
    constructors: constructors.data,
    focusRound,
    qualiRound: qualiSource,
    qualiName,
    qualifying: qualifying.data,
    result: raceResult,
    racePending,
    lastResult: result.data,
    fetchedAt: Math.max(weekends.savedAt, drivers.savedAt, constructors.savedAt, result.savedAt),
  };
}

/** Kvalifikation og løb for én runde. Samme cache som resten af sæsonen. */
export async function loadRound(
  round: number,
  options?: { fresh?: boolean },
): Promise<{ qualifying: QualifyingRow[]; result: RaceResult | null }> {
  const ttl = options?.fresh ? 0 : CACHE_TTL.resultsMs;
  const [qualifying, result] = await Promise.all([
    cached(
      `qualifying-${round}`,
      ttl,
      () => qualiOrEmpty(round),
      (rows) => rows.length === 0,
    ),
    cached(
      `result-${round}`,
      ttl,
      () => raceOrNull(round),
      (data) => data == null,
    ),
  ]);
  return { qualifying: qualifying.data, result: result.data };
}
