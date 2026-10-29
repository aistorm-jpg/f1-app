export interface Session {
  label: string;
  start: string;
  race: boolean;
}

export interface RaceWeekend {
  round: number;
  name: string;
  circuitId: string;
  circuitName: string;
  raceStart: string;
  sessions: Session[];
}

export interface DriverRow {
  position: number;
  familyName: string;
  points: number;
  teamId: string;
}

export interface ConstructorRow {
  position: number;
  name: string;
  points: number;
  teamId: string;
}

export interface QualifyingRow {
  position: number;
  familyName: string;
  teamId: string;
  q1: string | null;
  q2: string | null;
  q3: string | null;
}

export interface RaceResultRow {
  position: number | null;
  familyName: string;
  teamId: string;
  grid: number;
  laps: number;
  status: string;
  time: string | null;
  points: number;
  fastestLap: boolean;
}

export interface RaceResult {
  round: number;
  name: string;
  laps: number;
  rows: RaceResultRow[];
  podium: Array<{ code: string; teamId: string; teamName: string }>;
}
