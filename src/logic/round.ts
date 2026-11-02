import { raceShort } from "./board.ts";

/** Tal fra ?runde=, kun hvis runden findes i sæsonen. */
export function parseRoundQuery(value: string | null, rounds: readonly number[]): number | null {
  if (!value || !/^\d{1,2}$/.test(value)) return null;
  const round = Number(value);
  return rounds.includes(round) ? round : null;
}

export type RoundPhase = "opened" | "qualified" | "race-live" | "race-done";

export interface RoundFocus {
  round: number;
  phase: RoundPhase;
}

/** Tidspunktet weekenden åbner: første session, ellers løbsstart. */
export function weekendOpensAt(weekend: {
  raceStart: string;
  sessions?: readonly { start: string }[];
}): string {
  const starts = [weekend.raceStart, ...(weekend.sessions ?? []).map((session) => session.start)]
    .filter((start) => start.length > 0)
    .sort();
  return starts[0] ?? "";
}

/**
 * Den runde siden handler om.
 * Weekenden bliver den primære, så snart første session er startet.
 * Inden da er seneste afsluttede løb stadig den primære.
 */
export function focusRound(input: {
  weekends: readonly {
    round: number;
    raceStart: string;
    sessions?: readonly { start: string }[];
  }[];
  now: Date;
  qualiRounds: readonly number[];
  raceRounds: readonly number[];
  liveRaceRound?: number | null;
}): RoundFocus {
  const nowMs = input.now.getTime();
  const opened = input.weekends
    .filter((weekend) => {
      const opens = new Date(weekendOpensAt(weekend)).getTime();
      return Number.isFinite(opens) && opens <= nowMs;
    })
    .sort((a, b) => a.round - b.round);
  const current = opened[opened.length - 1];
  const lastDone = input.raceRounds.reduce((max, round) => Math.max(max, round), 0);
  if (!current) return { round: lastDone, phase: "race-done" };

  const raceDone = input.raceRounds.includes(current.round);
  const raceLive = input.liveRaceRound === current.round;
  const raceStarted = new Date(current.raceStart).getTime() <= nowMs;
  if (raceLive || (raceStarted && !raceDone)) return { round: current.round, phase: "race-live" };
  if (raceDone) return { round: current.round, phase: "race-done" };
  if (input.qualiRounds.includes(current.round))
    return { round: current.round, phase: "qualified" };
  return { round: current.round, phase: "opened" };
}

/** Runder der er åbnet, op til og med den primære. */
export function selectableRounds(
  weekends: readonly { round: number }[],
  lastRound: number,
): number[] {
  if (!Number.isInteger(lastRound) || lastRound <= 0) return [];
  return weekends
    .map((race) => race.round)
    .filter((round) => Number.isInteger(round) && round > 0 && round <= lastRound)
    .sort((a, b) => a - b);
}

/** "r18 · united states gp" */
export function roundMenuLabel(round: number, name: string): string {
  return `r${round} · ${raceShort(name)}`;
}
