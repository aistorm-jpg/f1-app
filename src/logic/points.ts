/**
 * Point i 2026, læst ud af Jolpicas resultater.
 * Løb: 25-18-15-12-10-8-6-4-2-1.
 * Sprint: 8-7-6-5-4-3-2-1.
 * Hurtigste omgang giver ikke et ekstra point. Det ses ved at Leclerc
 * i Austin 2026 havde hurtigste omgang og stadig fik 18 point for 2. pladsen.
 */

export const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] as const;
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1] as const;
export const FASTEST_LAP_POINT = 0;

export type PointsKind = "race" | "sprint";

export function tablePoints(kind: PointsKind, place: number): number {
  if (place < 1) return 0;
  const table = kind === "sprint" ? SPRINT_POINTS : RACE_POINTS;
  return table[place - 1] ?? 0;
}

export interface ClassifiedDriver {
  driverId: string;
  teamId: string;
  retired: boolean;
  fastestLap?: boolean;
}

/** Udgåede tæller ikke med i point-rækkefølgen. Hurtigste omgang lægger 0 til. */
export function awardSessionPoints(
  kind: PointsKind,
  rows: readonly ClassifiedDriver[],
): Array<{ driverId: string; teamId: string; points: number }> {
  let place = 0;
  return rows.map((row) => {
    if (row.retired) return { driverId: row.driverId, teamId: row.teamId, points: 0 };
    place += 1;
    const base = tablePoints(kind, place);
    const extra = row.fastestLap ? FASTEST_LAP_POINT : 0;
    return { driverId: row.driverId, teamId: row.teamId, points: base + extra };
  });
}

export interface StandingSeed {
  id: string;
  points: number;
  position: number;
}

export interface ProjectedStanding {
  id: string;
  points: number;
  added: number;
  position: number;
  /** Positivt betyder rykket frem i forhold til den officielle stilling. */
  change: number;
}

export function projectStandings(
  base: readonly StandingSeed[],
  additions: readonly { id: string; points: number }[],
): ProjectedStanding[] {
  const added = new Map<string, number>();
  for (const item of additions) {
    added.set(item.id, (added.get(item.id) ?? 0) + item.points);
  }
  const prior = new Map(base.map((row) => [row.id, row.position]));
  const rows = base.map((row) => ({
    id: row.id,
    points: row.points + (added.get(row.id) ?? 0),
    added: added.get(row.id) ?? 0,
    prior: row.position,
  }));
  for (const [id, points] of added) {
    if (prior.has(id)) continue;
    rows.push({ id, points, added: points, prior: Number.POSITIVE_INFINITY });
  }
  rows.sort((a, b) => b.points - a.points || a.prior - b.prior || a.id.localeCompare(b.id));
  return rows.map((row, index) => {
    const position = index + 1;
    const change = Number.isFinite(row.prior) ? row.prior - position : 0;
    return { id: row.id, points: row.points, added: row.added, position, change };
  });
}
