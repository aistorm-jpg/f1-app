import { formatLiveGap, type SampleDriver } from "./sample.ts";

const BASE = "https://api.openf1.org/v1";

export type OpenF1Result =
  | { ok: true; rows: SampleDriver[] }
  | { ok: false; reason: "locked" | "empty" | "error" };

let lockedUntil = 0;

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(`${BASE}/${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (response.status === 401 || response.status === 402 || response.status === 403) {
    lockedUntil = Date.now() + 15 * 60 * 1000;
    throw new Error("locked");
  }
  if (response.status === 429) throw new Error("rate");
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

function teamIdFromName(name: string): string {
  const key = name.toLowerCase();
  if (key.includes("red bull")) return "red_bull";
  if (key.includes("racing bull")) return "rb";
  if (key.includes("mercedes")) return "mercedes";
  if (key.includes("ferrari")) return "ferrari";
  if (key.includes("mclaren")) return "mclaren";
  if (key.includes("alpine")) return "alpine";
  if (key.includes("haas")) return "haas";
  if (key.includes("audi") || key.includes("sauber")) return "audi";
  if (key.includes("williams")) return "williams";
  if (key.includes("aston")) return "aston_martin";
  if (key.includes("cadillac")) return "cadillac";
  return "";
}

const CODE_TO_ID: Record<string, string> = {
  ANT: "antonelli",
  RUS: "russell",
  HAM: "hamilton",
  VER: "max_verstappen",
  LEC: "leclerc",
  NOR: "norris",
  PIA: "piastri",
  HAD: "hadjar",
  LAW: "lawson",
  GAS: "gasly",
  LIN: "lindblad",
  COL: "colapinto",
  BEA: "bearman",
  HUL: "hulkenberg",
  BOR: "bortoleto",
  OCO: "ocon",
  ALO: "alonso",
  SAI: "sainz",
  ALB: "albon",
  TSU: "tsunoda",
  STR: "stroll",
  BOT: "bottas",
  PER: "perez",
};

interface DriverInfo {
  driver_number: number;
  name_acronym?: string;
  team_name?: string;
}

interface IntervalRow {
  date: string;
  driver_number: number;
  gap_to_leader?: number | string | null;
  interval?: number | string | null;
}

/**
 * Henter et øjebliksbillede uden nøgle.
 * Under selve sessionen svarer OpenF1 ofte med afvisning, fordi live koster penge.
 * Bagefter er de samme adresser gratis.
 */
export async function fetchOpenF1Snapshot(sessionKey: number): Promise<OpenF1Result> {
  if (Date.now() < lockedUntil) return { ok: false, reason: "locked" };
  try {
    const since = new Date(Date.now() - 3 * 60 * 1000).toISOString().slice(0, 19);
    const [drivers, intervals] = await Promise.all([
      getJson(`drivers?session_key=${sessionKey}`) as Promise<DriverInfo[]>,
      getJson(
        `intervals?${new URLSearchParams({ session_key: String(sessionKey), "date>": since })}`,
      ) as Promise<IntervalRow[]>,
    ]);
    if (!Array.isArray(intervals) || intervals.length === 0) return { ok: false, reason: "empty" };
    const info = new Map(
      (Array.isArray(drivers) ? drivers : []).map((driver) => [driver.driver_number, driver]),
    );
    const latest = new Map<number, IntervalRow>();
    for (const row of intervals) {
      const prev = latest.get(row.driver_number);
      if (!prev || row.date > prev.date) latest.set(row.driver_number, row);
    }
    const rows: SampleDriver[] = [...latest.values()].map((row) => {
      const driver = info.get(row.driver_number);
      const code = driver?.name_acronym ?? String(row.driver_number);
      return {
        driverId: CODE_TO_ID[code] ?? code.toLowerCase(),
        code,
        teamId: teamIdFromName(driver?.team_name ?? ""),
        gap: row.gap_to_leader ?? "–",
        interval: row.interval ?? "–",
      };
    });
    rows.sort((a, b) => gapRank(a.gap) - gapRank(b.gap));
    return { ok: true, rows };
  } catch (error) {
    if (error instanceof Error && error.message === "locked")
      return { ok: false, reason: "locked" };
    return { ok: false, reason: "error" };
  }
}

function gapRank(value: number | string): number {
  if (typeof value === "number") return value;
  if (/lap/i.test(value)) return 100_000 + (Number(/\d+/.exec(value)?.[0] ?? 1) || 1);
  return 200_000;
}

export async function findOpenF1Session(
  startIso: string,
  name: "Race" | "Qualifying" | "Sprint",
): Promise<number | null> {
  if (Date.now() < lockedUntil) return null;
  try {
    const year = startIso.slice(0, 4);
    const sessions = (await getJson(
      `sessions?${new URLSearchParams({ year, session_name: name })}`,
    )) as Array<{ session_key: number; date_start: string }>;
    const target = new Date(startIso).getTime();
    let best: { key: number; delta: number } | null = null;
    for (const session of sessions) {
      const delta = Math.abs(new Date(session.date_start).getTime() - target);
      if (!best || delta < best.delta) best = { key: session.session_key, delta };
    }
    if (!best || best.delta > 3 * 60 * 1000) return null;
    return best.key;
  } catch {
    return null;
  }
}

export { formatLiveGap };
