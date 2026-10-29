const EIGHTHS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"];

/** Tegn-søjle i forhold til føringen. Resten er prikker. */
export function pointsBar(
  value: number,
  max: number,
  width = 26,
): { filled: string; rest: string } {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0 || value <= 0) {
    return { filled: "", rest: "·".repeat(width) };
  }
  const scaled = Math.min(width, (value / max) * width);
  const full = Math.floor(scaled);
  const remainder = Math.floor((scaled - full) * 8);
  let filled = "█".repeat(full);
  const eighth = EIGHTHS[remainder] ?? "";
  if (eighth && filled.length < width) filled += eighth;
  if (filled.length > width) filled = filled.slice(0, width);
  return { filled, rest: "·".repeat(width - filled.length) };
}

/** Tom streng for føringen, ellers et negativt tal som "-123". */
export function gapText(points: number, leader: number): string {
  if (!Number.isFinite(points) || !Number.isFinite(leader) || points === leader) return "";
  const diff = points - leader;
  if (Number.isInteger(diff)) return String(diff);
  const sign = diff < 0 ? "-" : "";
  return `${sign}${Math.abs(diff).toFixed(1)}`;
}

export function formatPoints(points: number): string {
  if (!Number.isFinite(points)) return "0";
  if (Number.isInteger(points)) return String(points);
  return points.toFixed(1);
}

const TEAM_SHORT: Record<string, string> = {
  "RB F1 Team": "racing bulls",
  "Alpine F1 Team": "alpine",
  "Haas F1 Team": "haas",
  "Cadillac F1 Team": "cadillac",
};

export function teamLabel(name: string): string {
  return (TEAM_SHORT[name] ?? name).toLowerCase();
}

export function raceShort(name: string): string {
  return name.toLowerCase().replace(" grand prix", " gp");
}

/** Positivt tal er pladser vundet fra start. */
export function placesDelta(
  grid: number,
  finish: number | null,
): { kind: "up" | "down" | "same" | "none"; text: string } {
  if (finish == null || !Number.isFinite(grid) || grid <= 0) return { kind: "none", text: "" };
  const delta = grid - finish;
  if (delta > 0) return { kind: "up", text: `▲${delta}` };
  if (delta < 0) return { kind: "down", text: `▼${-delta}` };
  return { kind: "same", text: "·" };
}

/** "1:34.035" til millisekunder. */
export function lapToMs(value: string): number | null {
  const match = /^(\d+):(\d{2})\.(\d{1,3})$/.exec(value.trim());
  if (!match) return null;
  const millis = match[3].padEnd(3, "0").slice(0, 3);
  return Number(match[1]) * 60_000 + Number(match[2]) * 1_000 + Number(millis);
}

export function fastestLap(times: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestMs = Infinity;
  for (const time of times) {
    if (!time) continue;
    const ms = lapToMs(time);
    if (ms == null || ms >= bestMs) continue;
    bestMs = ms;
    best = time;
  }
  return best;
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  elapsed: boolean;
}

export function countdownParts(targetIso: string, now: Date): CountdownParts {
  const target = new Date(targetIso).getTime();
  if (!Number.isFinite(target)) return { days: 0, hours: 0, minutes: 0, elapsed: true };
  const total = target - now.getTime();
  if (total <= 0) return { days: 0, hours: 0, minutes: 0, elapsed: true };
  const minutesTotal = Math.floor(total / 60_000);
  return {
    days: Math.floor(minutesTotal / (60 * 24)),
    hours: Math.floor((minutesTotal % (60 * 24)) / 60),
    minutes: minutesTotal % 60,
    elapsed: false,
  };
}

export function pad2(value: number): string {
  return String(Math.max(0, Math.trunc(value))).padStart(2, "0");
}
