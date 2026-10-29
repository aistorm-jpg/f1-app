import type { Session, SessionKind } from "../data/types.ts";

/** Minutter før start, hvor vi begynder at kigge efter tider. */
export const LIVE_BEFORE_MS = 10 * 60 * 1000;

/** Hvor længe efter start sessionen stadig regnes som i gang. */
const LIVE_AFTER_MS: Record<SessionKind, number> = {
  practice1: 70 * 60 * 1000,
  practice2: 70 * 60 * 1000,
  practice3: 70 * 60 * 1000,
  sprintQualifying: 55 * 60 * 1000,
  sprint: 50 * 60 * 1000,
  qualifying: 75 * 60 * 1000,
  race: 150 * 60 * 1000,
};

export function isSessionLive(startIso: string, kind: SessionKind, now: Date): boolean {
  const start = new Date(startIso).getTime();
  if (!Number.isFinite(start)) return false;
  const time = now.getTime();
  return time >= start - LIVE_BEFORE_MS && time <= start + LIVE_AFTER_MS[kind];
}

const PRIORITY: Record<SessionKind, number> = {
  race: 5,
  sprint: 4,
  qualifying: 3,
  sprintQualifying: 2,
  practice1: 1,
  practice2: 1,
  practice3: 1,
};

/** Den session der er i gang. Løb vinder, hvis to vinduer overlapper. */
export function activeSession<T extends Pick<Session, "kind" | "start">>(
  sessions: readonly T[],
  now: Date,
): T | null {
  const live = sessions.filter((session) => isSessionLive(session.start, session.kind, now));
  live.sort((a, b) => PRIORITY[b.kind] - PRIORITY[a.kind] || b.start.localeCompare(a.start));
  return live[0] ?? null;
}

/**
 * Kvalens tre dele, når vi ikke har en fase fra OpenF1.
 * Q1 ca. 18 min, pause, Q2 ca. 15 min, pause, Q3.
 */
export function qualifyingSegment(startIso: string, now: Date): "Q1" | "Q2" | "Q3" {
  const start = new Date(startIso).getTime();
  const minutes = (now.getTime() - start) / 60_000;
  if (minutes < 22) return "Q1";
  if (minutes < 45) return "Q2";
  return "Q3";
}
