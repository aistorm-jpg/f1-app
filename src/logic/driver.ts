export interface DriverRound {
  round: number;
  name: string;
  position: number | null;
  points: number;
  teamId: string;
}

export interface DriverQualiRound {
  round: number;
  position: number | null;
}

export interface DriverCard {
  id: string;
  familyName: string;
  teamId: string;
  races: DriverRound[];
  qualifying: DriverQualiRound[];
}

export interface DriverSummary {
  wins: number;
  podiums: number;
  dnfs: number;
  points: number;
}

export interface HeadToHead {
  quali: { driver: number; teammate: number };
  race: { driver: number; teammate: number };
  points: { driver: number; teammate: number };
}

export interface PointBar {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Kun et kører-id fra Jolpica, som `hamilton` eller `max_verstappen`. */
export function parseDriverQuery(value: string | null): string | null {
  if (!value || !/^[a-z0-9_]{1,40}$/i.test(value)) return null;
  return value.toLowerCase();
}

export function teammateId(
  rows: readonly { id: string; teamId: string }[],
  driverId: string,
): string | null {
  const self = rows.find((row) => row.id === driverId);
  if (!self?.teamId) return null;
  return rows.find((row) => row.id !== driverId && row.teamId === self.teamId)?.id ?? null;
}

export function summarize(races: readonly DriverRound[]): DriverSummary {
  const summary: DriverSummary = { wins: 0, podiums: 0, dnfs: 0, points: 0 };
  for (const race of races) {
    summary.points += Number.isFinite(race.points) ? race.points : 0;
    if (race.position == null) {
      summary.dnfs += 1;
      continue;
    }
    if (race.position === 1) summary.wins += 1;
    if (race.position <= 3) summary.podiums += 1;
  }
  return summary;
}

/** Lavere placering vinder. En klassificeret slår en udgået. To udgåede tæller ikke. */
export function ahead(a: number | null, b: number | null): "a" | "b" | "tie" {
  if (a != null && b != null) {
    if (a < b) return "a";
    if (b < a) return "b";
    return "tie";
  }
  if (a != null) return "a";
  if (b != null) return "b";
  return "tie";
}

export function headToHead(driver: DriverCard, teammate: DriverCard): HeadToHead {
  const races = new Map(teammate.races.map((race) => [race.round, race]));
  const quali = new Map(teammate.qualifying.map((row) => [row.round, row]));
  const result: HeadToHead = {
    quali: { driver: 0, teammate: 0 },
    race: { driver: 0, teammate: 0 },
    points: {
      driver: summarize(driver.races).points,
      teammate: summarize(teammate.races).points,
    },
  };
  for (const race of driver.races) {
    const other = races.get(race.round);
    if (!other) continue;
    const winner = ahead(race.position, other.position);
    if (winner === "a") result.race.driver += 1;
    if (winner === "b") result.race.teammate += 1;
  }
  for (const row of driver.qualifying) {
    const other = quali.get(row.round);
    if (!other) continue;
    const winner = ahead(row.position, other.position);
    if (winner === "a") result.quali.driver += 1;
    if (winner === "b") result.quali.teammate += 1;
  }
  return result;
}

/** Søjler nedefra. Den højeste søjle er runden med flest point. */
export function pointBars(values: readonly number[], width: number, height: number): PointBar[] {
  if (values.length === 0 || width <= 0 || height <= 0) return [];
  const gap = values.length > 1 ? Math.min(3, width / values.length / 4) : 0;
  const barWidth = (width - gap * (values.length - 1)) / values.length;
  const max = Math.max(1, ...values.map((value) => (Number.isFinite(value) ? value : 0)));
  return values.map((value, index) => {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
    const barHeight = (safe / max) * height;
    return {
      x: index * (barWidth + gap),
      y: height - barHeight,
      w: barWidth,
      h: barHeight,
    };
  });
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isRetired(positionText: unknown, status: unknown): boolean {
  const text = String(positionText ?? "").toUpperCase();
  if (text === "R" || text === "W" || text === "D" || text === "E" || text === "N") return true;
  const name = String(status ?? "").toLowerCase();
  return (
    name === "retired" || name === "disqualified" || name === "withdrawn" || name === "excluded"
  );
}

export function mapDriverCard(id: string, results: unknown, qualifying: unknown): DriverCard {
  const racesPayload = results as {
    MRData?: {
      RaceTable?: {
        Races?: Array<{
          round?: string;
          raceName?: string;
          Results?: Array<{
            position?: string;
            positionText?: string;
            points?: string;
            status?: string;
            Driver?: { familyName?: string };
            Constructor?: { constructorId?: string };
          }>;
        }>;
      };
    };
  };
  const qualiPayload = qualifying as {
    MRData?: {
      RaceTable?: {
        Races?: Array<{
          round?: string;
          QualifyingResults?: Array<{ position?: string }>;
        }>;
      };
    };
  };
  const races = (racesPayload.MRData?.RaceTable?.Races ?? [])
    .map((race) => {
      const row = race.Results?.[0];
      if (!row) return null;
      const retired = isRetired(row.positionText, row.status);
      return {
        round: numberOrNull(race.round) ?? 0,
        name: race.raceName ?? "",
        position: retired ? null : numberOrNull(row.position),
        points: Number(row.points) || 0,
        teamId: row.Constructor?.constructorId ?? "",
      };
    })
    .filter((race): race is DriverRound => race != null && race.round > 0)
    .sort((a, b) => a.round - b.round);
  const qualiRows = (qualiPayload.MRData?.RaceTable?.Races ?? [])
    .map((race) => {
      const row = race.QualifyingResults?.[0];
      return {
        round: numberOrNull(race.round) ?? 0,
        position: numberOrNull(row?.position),
      };
    })
    .filter((row) => row.round > 0)
    .sort((a, b) => a.round - b.round);
  const first = racesPayload.MRData?.RaceTable?.Races?.[0]?.Results?.[0];
  return {
    id,
    familyName: first?.Driver?.familyName ?? id,
    teamId: races[races.length - 1]?.teamId ?? "",
    races,
    qualifying: qualiRows,
  };
}
