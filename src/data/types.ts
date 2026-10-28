export type SessionKind =
  | "practice1"
  | "practice2"
  | "practice3"
  | "sprintQualifying"
  | "sprint"
  | "qualifying"
  | "race";

export interface Session {
  kind: SessionKind;
  start: string;
}

export interface Race {
  season: string;
  round: number;
  name: string;
  officialName: string;
  circuit: string;
  locality: string;
  country: string;
  sprintWeekend: boolean;
  sessions: Session[];
}

export interface Person {
  id: string;
  code: string;
  number: string;
  givenName: string;
  familyName: string;
}

export interface Team {
  id: string;
  name: string;
}

export interface DriverStanding {
  position: number;
  points: number;
  wins: number;
  driver: Person;
  teams: Team[];
}

export interface ConstructorStanding {
  position: number;
  points: number;
  wins: number;
  team: Team;
}

export interface StandingsTable<T> {
  season: string;
  round: number;
  rows: T[];
}

export interface QualifyingRow {
  position: number;
  driver: Person;
  team: Team;
  q1: string | null;
  q2: string | null;
  q3: string | null;
}

export interface ResultRow {
  position: number;
  points: number;
  grid: number;
  laps: number;
  status: string;
  time: string | null;
  fastestLapRank: string | null;
  driver: Person;
  team: Team;
}

export interface LatestWinner {
  round: number;
  raceName: string;
  date: string;
  driver: Person;
  team: Team;
  time: string | null;
  points: number;
}

export interface ApiSession {
  date: string;
  time?: string;
}

export interface ApiDriver {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  givenName: string;
  familyName: string;
  nationality?: string;
}

export interface ApiTeam {
  constructorId: string;
  name: string;
  nationality?: string;
}

export interface ApiRace {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: {
    circuitName: string;
    Location: {
      locality: string;
      country: string;
    };
  };
  FirstPractice?: ApiSession;
  SecondPractice?: ApiSession;
  ThirdPractice?: ApiSession;
  Qualifying?: ApiSession;
  Sprint?: ApiSession;
  SprintQualifying?: ApiSession;
}

export interface ApiScheduleResponse {
  MRData?: {
    RaceTable?: {
      season?: string;
      Races?: ApiRace[];
    };
  };
}

export interface ApiDriverStanding {
  position: string;
  points: string;
  wins: string;
  Driver: ApiDriver;
  Constructors?: ApiTeam[];
}

export interface ApiConstructorStanding {
  position: string;
  points: string;
  wins: string;
  Constructor: ApiTeam;
}

export interface ApiDriverStandingsResponse {
  MRData?: {
    StandingsTable?: {
      season?: string;
      round?: string;
      StandingsLists?: Array<{
        season?: string;
        round?: string;
        DriverStandings?: ApiDriverStanding[];
      }>;
    };
  };
}

export interface ApiConstructorStandingsResponse {
  MRData?: {
    StandingsTable?: {
      season?: string;
      round?: string;
      StandingsLists?: Array<{
        season?: string;
        round?: string;
        ConstructorStandings?: ApiConstructorStanding[];
      }>;
    };
  };
}

export interface ApiResult {
  position: string;
  points: string;
  grid?: string;
  laps?: string;
  status: string;
  Time?: { time?: string };
  FastestLap?: { rank?: string };
  Driver: ApiDriver;
  Constructor: ApiTeam;
}

export interface ApiQualifyingResult {
  position: string;
  Driver: ApiDriver;
  Constructor: ApiTeam;
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

export interface ApiRaceBundle {
  season?: string;
  round?: string;
  raceName?: string;
  date?: string;
  time?: string;
  Results?: ApiResult[];
  QualifyingResults?: ApiQualifyingResult[];
  SprintResults?: ApiResult[];
}

export interface ApiResultsResponse {
  MRData?: {
    RaceTable?: {
      season?: string;
      round?: string;
      Races?: ApiRaceBundle[];
    };
  };
}
