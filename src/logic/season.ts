/** Et løb regnes som "i gang" i tre timer efter start. Derefter er det kørt. */
export const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

export type RacePhase = "completed" | "live" | "next" | "upcoming";

export interface CountdownParts {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  elapsed: boolean;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function raceStartIso(sessions: readonly { kind: string; start: string }[]): string {
  return sessions.find((session) => session.kind === "race")?.start ?? sessions[0]?.start ?? "";
}

/** "upcoming" før start, "live" de første tre timer, ellers "completed". */
export function racePhase(
  startIso: string,
  now: Date,
  liveWindowMs = LIVE_WINDOW_MS,
): Exclude<RacePhase, "next"> {
  const start = new Date(startIso).getTime();
  if (!Number.isFinite(start)) return "upcoming";
  const delta = now.getTime() - start;
  if (delta < 0) return "upcoming";
  if (delta < liveWindowMs) return "live";
  return "completed";
}

/**
 * Sorterer efter start og markerer ét løb som "next":
 * det første der ikke er startet. Hvis et løb er i gang, er det highlightet,
 * og der markeres ikke også et "next".
 */
export function annotateRaces<T extends { start: string }>(
  races: readonly T[],
  now: Date,
  liveWindowMs = LIVE_WINDOW_MS,
): Array<T & { phase: RacePhase }> {
  const ordered = [...races].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
  const phased = ordered.map((race) => ({
    ...race,
    phase: racePhase(race.start, now, liveWindowMs) as RacePhase,
  }));
  if (phased.some((race) => race.phase === "live")) return phased;

  let markedNext = false;
  return phased.map((race) => {
    if (!markedNext && race.phase === "upcoming") {
      markedNext = true;
      return { ...race, phase: "next" };
    }
    return race;
  });
}

export function pickFeatured<T extends { phase: RacePhase }>(
  races: readonly T[],
): { race: T; phase: "next" | "live" | "season-over" } | null {
  const live = races.find((race) => race.phase === "live");
  if (live) return { race: live, phase: "live" };
  const next = races.find((race) => race.phase === "next");
  if (next) return { race: next, phase: "next" };
  for (let index = races.length - 1; index >= 0; index -= 1) {
    const race = races[index];
    if (race?.phase === "completed") return { race, phase: "season-over" };
  }
  return null;
}

/** Seneste runde der er startet. `null` hvis sæsonen ikke er i gang. */
export function latestStartedRound(
  races: readonly { round: number; start: string }[],
  now: Date,
): number | null {
  const annotated = annotateRaces(races, now);
  for (let index = annotated.length - 1; index >= 0; index -= 1) {
    const race = annotated[index];
    if (race && (race.phase === "completed" || race.phase === "live")) return race.round;
  }
  return null;
}

/** Hvor stor en del af førerens point en kører eller et team har. 0 til 1. */
export function pointsRatio(points: number, leaderPoints: number): number {
  if (!Number.isFinite(points) || !Number.isFinite(leaderPoints) || leaderPoints <= 0) return 0;
  return Math.min(1, Math.max(0, points / leaderPoints));
}

export function countdownParts(targetIso: string, now: Date): CountdownParts {
  const target = new Date(targetIso).getTime();
  if (!Number.isFinite(target)) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, elapsed: true };
  }
  const totalMs = target - now.getTime();
  const elapsed = totalMs <= 0;
  let rest = Math.abs(totalMs);
  const days = Math.floor(rest / DAY);
  rest -= days * DAY;
  const hours = Math.floor(rest / HOUR);
  rest -= hours * HOUR;
  const minutes = Math.floor(rest / MINUTE);
  rest -= minutes * MINUTE;
  const seconds = Math.floor(rest / SECOND);
  return { totalMs, days, hours, minutes, seconds, elapsed };
}

export function pad2(value: number): string {
  return Math.trunc(Math.abs(value)).toString().padStart(2, "0");
}
