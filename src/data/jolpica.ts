import { SEASON } from "../config.ts";
import { loadCached, type KeyValueStore } from "./cache.ts";
import {
  mapConstructorStandings,
  mapDriverStandings,
  mapLatestWinner,
  mapQualifying,
  mapRaceResults,
  mapSchedule,
  mapSprintResults,
} from "./map.ts";
import type {
  ApiConstructorStandingsResponse,
  ApiDriverStandingsResponse,
  ApiResultsResponse,
  ApiScheduleResponse,
  ConstructorStanding,
  DriverStanding,
  LatestWinner,
  QualifyingRow,
  Race,
  ResultRow,
  StandingsTable,
} from "./types.ts";

const BASE = "https://api.jolpi.ca/ergast/f1";
const PREFIX = "apex.v1";

/** Kalenderen ændrer sig sjældent. Stilling og resultater må gerne være få minutter gamle. */
export const CACHE_TTL = {
  scheduleMs: 6 * 60 * 60 * 1000,
  standingsMs: 5 * 60 * 1000,
  resultsMs: 5 * 60 * 1000,
} as const;

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
  if (!response.ok) {
    throw new Error(`Jolpica svarede ${response.status} på ${path}`);
  }
  return (await response.json()) as T;
}

function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  return loadCached({
    store: browserStore(),
    key: `${PREFIX}.${SEASON}.${key}`,
    ttlMs,
    load,
  });
}

export function getSchedule(): Promise<Race[]> {
  return cached("schedule", CACHE_TTL.scheduleMs, async () => {
    const payload = await getJson<ApiScheduleResponse>(`${SEASON}.json?limit=100`);
    return mapSchedule(payload);
  });
}

export function getDriverStandings(): Promise<StandingsTable<DriverStanding>> {
  return cached("drivers", CACHE_TTL.standingsMs, async () => {
    const payload = await getJson<ApiDriverStandingsResponse>(
      `${SEASON}/driverStandings.json?limit=100`,
    );
    return mapDriverStandings(payload);
  });
}

export function getConstructorStandings(): Promise<StandingsTable<ConstructorStanding>> {
  return cached("constructors", CACHE_TTL.standingsMs, async () => {
    const payload = await getJson<ApiConstructorStandingsResponse>(
      `${SEASON}/constructorStandings.json?limit=100`,
    );
    return mapConstructorStandings(payload);
  });
}

export function getLatestWinner(): Promise<LatestWinner | null> {
  return cached("latest-winner", CACHE_TTL.resultsMs, async () => {
    const payload = await getJson<ApiResultsResponse>(`${SEASON}/last/results.json?limit=1`);
    return mapLatestWinner(payload);
  });
}

export function getRaceResults(round: number): Promise<ResultRow[]> {
  return cached(`race-${round}`, CACHE_TTL.resultsMs, async () => {
    const payload = await getJson<ApiResultsResponse>(`${SEASON}/${round}/results.json?limit=100`);
    return mapRaceResults(payload);
  });
}

export function getQualifying(round: number): Promise<QualifyingRow[]> {
  return cached(`qualifying-${round}`, CACHE_TTL.resultsMs, async () => {
    const payload = await getJson<ApiResultsResponse>(
      `${SEASON}/${round}/qualifying.json?limit=100`,
    );
    return mapQualifying(payload);
  });
}

export function getSprintResults(round: number): Promise<ResultRow[]> {
  return cached(`sprint-${round}`, CACHE_TTL.resultsMs, async () => {
    const payload = await getJson<ApiResultsResponse>(`${SEASON}/${round}/sprint.json?limit=100`);
    return mapSprintResults(payload);
  });
}
