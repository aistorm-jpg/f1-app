/**
 * Udsnit fra OpenF1, USA's løb 2026, omkring 21:01 UTC.
 * Bruges kun når adressen har ?demo=live, så live-tavlen kan ses uden et løb i gang.
 */
export interface SampleDriver {
  driverId: string;
  code: string;
  teamId: string;
  gap: number | string;
  interval: number | string;
  retired?: boolean;
  bestLap?: string;
}

export const SAMPLE_RACE: SampleDriver[] = [
  {
    driverId: "antonelli",
    code: "ANT",
    teamId: "mercedes",
    gap: 0,
    interval: 0,
    bestLap: "1:37.8",
  },
  {
    driverId: "leclerc",
    code: "LEC",
    teamId: "ferrari",
    gap: 1.617,
    interval: 1.617,
    bestLap: "1:38.1",
  },
  {
    driverId: "hamilton",
    code: "HAM",
    teamId: "ferrari",
    gap: 7.611,
    interval: 6.041,
    bestLap: "1:38.4",
  },
  {
    driverId: "norris",
    code: "NOR",
    teamId: "mclaren",
    gap: 13.161,
    interval: 5.447,
    bestLap: "1:37.9",
  },
  {
    driverId: "max_verstappen",
    code: "VER",
    teamId: "red_bull",
    gap: 18.296,
    interval: 5.119,
    bestLap: "1:38.0",
  },
  {
    driverId: "hadjar",
    code: "HAD",
    teamId: "red_bull",
    gap: 26.828,
    interval: 8.4,
    bestLap: "1:38.6",
  },
  {
    driverId: "piastri",
    code: "PIA",
    teamId: "mclaren",
    gap: 30.757,
    interval: 3.956,
    bestLap: "1:38.5",
  },
  {
    driverId: "russell",
    code: "RUS",
    teamId: "mercedes",
    gap: 31.273,
    interval: 0.516,
    bestLap: "1:38.2",
  },
  {
    driverId: "lawson",
    code: "LAW",
    teamId: "rb",
    gap: 58.688,
    interval: 27.861,
    bestLap: "1:39.1",
  },
  {
    driverId: "gasly",
    code: "GAS",
    teamId: "alpine",
    gap: 63.993,
    interval: 5.305,
    bestLap: "1:39.4",
  },
  {
    driverId: "lindblad",
    code: "LIN",
    teamId: "rb",
    gap: 69.904,
    interval: 6.016,
    bestLap: "1:39.2",
  },
  {
    driverId: "ocon",
    code: "OCO",
    teamId: "haas",
    gap: 72.414,
    interval: 2.647,
    bestLap: "1:39.6",
  },
  {
    driverId: "hulkenberg",
    code: "HUL",
    teamId: "audi",
    gap: 74.534,
    interval: 2.12,
    bestLap: "1:39.5",
  },
  {
    driverId: "alonso",
    code: "ALO",
    teamId: "aston_martin",
    gap: 77.984,
    interval: 3.581,
    bestLap: "1:39.8",
  },
  {
    driverId: "bortoleto",
    code: "BOR",
    teamId: "audi",
    gap: 80.681,
    interval: 2.697,
    bestLap: "1:39.9",
  },
  {
    driverId: "stroll",
    code: "STR",
    teamId: "aston_martin",
    gap: 92.373,
    interval: 11.847,
    bestLap: "1:40.2",
  },
  {
    driverId: "sainz",
    code: "SAI",
    teamId: "williams",
    gap: 98.581,
    interval: 6.402,
    bestLap: "1:40.1",
  },
  {
    driverId: "colapinto",
    code: "COL",
    teamId: "alpine",
    gap: "+1 LAP",
    interval: 4.054,
    bestLap: "1:40.4",
  },
  {
    driverId: "bottas",
    code: "BOT",
    teamId: "cadillac",
    gap: "+1 LAP",
    interval: 12.985,
    bestLap: "1:40.8",
  },
  {
    driverId: "perez",
    code: "PER",
    teamId: "cadillac",
    gap: "+1 LAP",
    interval: 5.129,
    bestLap: "1:41.0",
  },
  {
    driverId: "albon",
    code: "ALB",
    teamId: "williams",
    gap: "+1 LAP",
    interval: 12.027,
    bestLap: "1:40.6",
  },
  { driverId: "bearman", code: "BEA", teamId: "haas", gap: 0, interval: 0, retired: true },
];

export const SAMPLE_QUALI: SampleDriver[] = [
  {
    driverId: "antonelli",
    code: "ANT",
    teamId: "mercedes",
    gap: 0,
    interval: 0,
    bestLap: "1:34.102",
  },
  {
    driverId: "leclerc",
    code: "LEC",
    teamId: "ferrari",
    gap: 0.214,
    interval: 0.214,
    bestLap: "1:34.316",
  },
  {
    driverId: "max_verstappen",
    code: "VER",
    teamId: "red_bull",
    gap: 0.381,
    interval: 0.167,
    bestLap: "1:34.483",
  },
  {
    driverId: "norris",
    code: "NOR",
    teamId: "mclaren",
    gap: 0.44,
    interval: 0.059,
    bestLap: "1:34.542",
  },
  {
    driverId: "hamilton",
    code: "HAM",
    teamId: "ferrari",
    gap: 0.61,
    interval: 0.17,
    bestLap: "1:34.712",
  },
  {
    driverId: "piastri",
    code: "PIA",
    teamId: "mclaren",
    gap: 0.802,
    interval: 0.192,
    bestLap: "1:34.904",
  },
  {
    driverId: "russell",
    code: "RUS",
    teamId: "mercedes",
    gap: 0.955,
    interval: 0.153,
    bestLap: "1:35.057",
  },
  {
    driverId: "hadjar",
    code: "HAD",
    teamId: "red_bull",
    gap: 1.12,
    interval: 0.165,
    bestLap: "1:35.222",
  },
];

export function formatLiveGap(value: number | string | null | undefined): string {
  if (value == null || value === "") return "–";
  if (typeof value === "string") {
    const laps = /(\d+)/.exec(value);
    if (/lap/i.test(value)) return `+${laps?.[1] ?? "1"} omg.`;
    return value;
  }
  if (value === 0) return "·";
  return `+${value.toFixed(3)}`;
}
