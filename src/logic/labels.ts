import type { RacePhase } from "./season.ts";
import type { SessionKind } from "../data/types.ts";

const RACE_NAMES: Record<string, string> = {
  "Australian Grand Prix": "Australiens Grand Prix",
  "Chinese Grand Prix": "Kinas Grand Prix",
  "Japanese Grand Prix": "Japans Grand Prix",
  "Miami Grand Prix": "Miami Grand Prix",
  "Canadian Grand Prix": "Canadas Grand Prix",
  "Monaco Grand Prix": "Monacos Grand Prix",
  "Barcelona Grand Prix": "Barcelonas Grand Prix",
  "Austrian Grand Prix": "Østrigs Grand Prix",
  "British Grand Prix": "Storbritanniens Grand Prix",
  "Belgian Grand Prix": "Belgiens Grand Prix",
  "Hungarian Grand Prix": "Ungarns Grand Prix",
  "Dutch Grand Prix": "Hollands Grand Prix",
  "Italian Grand Prix": "Italiens Grand Prix",
  "Spanish Grand Prix": "Spaniens Grand Prix",
  "Azerbaijan Grand Prix": "Aserbajdsjans Grand Prix",
  "Bahrain Grand Prix in Malaysia": "Bahrains Grand Prix i Malaysia",
  "Singapore Grand Prix": "Singapores Grand Prix",
  "United States Grand Prix": "USA's Grand Prix",
  "Mexico City Grand Prix": "Mexicos Grand Prix",
  "Brazilian Grand Prix": "Brasiliens Grand Prix",
  "Las Vegas Grand Prix": "Las Vegas Grand Prix",
  "Qatar Grand Prix": "Qatars Grand Prix",
  "Abu Dhabi Grand Prix": "Abu Dhabis Grand Prix",
};

const COUNTRIES: Record<string, string> = {
  Australia: "Australien",
  China: "Kina",
  Japan: "Japan",
  USA: "USA",
  Canada: "Canada",
  Monaco: "Monaco",
  Spain: "Spanien",
  Austria: "Østrig",
  UK: "Storbritannien",
  Belgium: "Belgien",
  Hungary: "Ungarn",
  Netherlands: "Holland",
  Italy: "Italien",
  Azerbaijan: "Aserbajdsjan",
  Malaysia: "Malaysia",
  Singapore: "Singapore",
  Mexico: "Mexico",
  Brazil: "Brasilien",
  Qatar: "Qatar",
  UAE: "De Forenede Arabiske Emirater",
  Bahrain: "Bahrain",
};

const STATUS_LABELS: Record<string, string> = {
  Finished: "I mål",
  Retired: "Udgået",
  Disqualified: "Diskvalificeret",
  Accident: "Uheld",
  Collision: "Kollision",
  Withdrew: "Trukket",
  "Not classified": "Ikke klassificeret",
  Lapped: "Omganget",
  "Did not start": "Startede ikke",
  Engine: "Motor",
  Gearbox: "Gearkasse",
  "Spun off": "Snurrede af",
};

const SESSION_LABELS: Record<SessionKind, string> = {
  practice1: "1. træning",
  practice2: "2. træning",
  practice3: "3. træning",
  sprintQualifying: "Sprint-kvalifikation",
  sprint: "Sprint",
  qualifying: "Kvalifikation",
  race: "Løb",
};

const pointsFormat = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 1 });

export function raceDisplayName(officialName: string): string {
  return RACE_NAMES[officialName] ?? officialName;
}

export function countryName(country: string): string {
  return COUNTRIES[country] ?? country;
}

export function sessionLabel(kind: SessionKind): string {
  return SESSION_LABELS[kind];
}

export function phaseLabel(phase: RacePhase): string {
  switch (phase) {
    case "completed":
      return "Kørt";
    case "live":
      return "I gang";
    case "next":
      return "Næste";
    case "upcoming":
      return "Kommende";
  }
}

export function statusLabel(status: string): string {
  const known = STATUS_LABELS[status];
  if (known) return known;
  const laps = /^\+(\d+) Laps?$/i.exec(status);
  if (laps) {
    return laps[1] === "1" ? "+1 omgang" : `+${laps[1]} omgange`;
  }
  return status;
}

export function formatPoints(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return pointsFormat.format(value);
}

export function winsLabel(wins: number): string {
  return wins === 1 ? "1 sejr" : `${wins} sejre`;
}

export function gridLabel(grid: number): string {
  if (grid <= 0) return "Pit";
  return String(grid);
}
