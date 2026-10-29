import { raceShort } from "./board.ts";

/** Tal fra ?runde=, kun hvis runden findes i sæsonen. */
export function parseRoundQuery(value: string | null, rounds: readonly number[]): number | null {
  if (!value || !/^\d{1,2}$/.test(value)) return null;
  const round = Number(value);
  return rounds.includes(round) ? round : null;
}

/** Runder der er kørt, op til og med seneste resultat. */
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
