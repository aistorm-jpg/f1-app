import { SEASON } from "../config.ts";
import { loadCachedEntry, type KeyValueStore } from "./cache.ts";
import { mapConstructors, mapDrivers, mapQualifying, mapRaceResult, mapSchedule } from "./map.ts";
import type { ConstructorRow, DriverRow, QualifyingRow, RaceResult, RaceWeekend } from "./types.ts";

const BASE = "https://api.jolpi.ca/ergast/f1";
const PREFIX = "apex.v2";

export const CACHE_TTL = {
  scheduleMs: 6 * 60 * 60 * 1000,
  standingsMs: 5 * 60 * 1000,
  resultsMs: 5 * 60 * 1000,
} as const;

export interface BoardData {
  weekends: RaceWeekend[];
  drivers: { round: number; rows: DriverRow[] };
  constructors: { round: number; rows: ConstructorRow[] };
  qualifying: QualifyingRow[];
  result: RaceResult | null;
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

function cached<T>(key: string, ttlMs: number, load: () => Promise<T>) {
  return loadCachedEntry({
    store: browserStore(),
    key: `${PREFIX}.${SEASON}.${key}`,
    ttlMs,
    load,
  });
}

export async function loadBoard(): Promise<BoardData> {
  const [weekends, drivers, constructors, result] = await Promise.all([
    cached("schedule", CACHE_TTL.scheduleMs, async () =>
      mapSchedule(await getJson(`${SEASON}.json?limit=100`)),
    ),
    cached("drivers", CACHE_TTL.standingsMs, async () =>
      mapDrivers(await getJson(`${SEASON}/driverStandings.json?limit=100`)),
    ),
    cached("constructors", CACHE_TTL.standingsMs, async () =>
      mapConstructors(await getJson(`${SEASON}/constructorStandings.json?limit=100`)),
    ),
    cached("last-result", CACHE_TTL.resultsMs, async () =>
      mapRaceResult(await getJson(`${SEASON}/last/results.json?limit=100`)),
    ),
  ]);

  const round = result.data?.round ?? 0;
  const qualifying =
    round > 0
      ? await cached(`qualifying-${round}`, CACHE_TTL.resultsMs, async () =>
          mapQualifying(await getJson(`${SEASON}/${round}/qualifying.json?limit=100`)),
        )
      : { data: [] as QualifyingRow[], savedAt: result.savedAt };

  return {
    weekends: weekends.data,
    drivers: drivers.data,
    constructors: constructors.data,
    qualifying: qualifying.data,
    result: result.data,
    fetchedAt: Math.max(weekends.savedAt, drivers.savedAt, constructors.savedAt, result.savedAt),
  };
}
