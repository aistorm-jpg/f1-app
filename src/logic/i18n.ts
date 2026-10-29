import type { SessionKind } from "../data/types.ts";

export const LANGS = ["da", "en"] as const;
export type Lang = (typeof LANGS)[number];

export interface Copy {
  langLabel: string;
  skip: string;
  loadingSeason: string;
  metaDescription: string;
  live: string;
  nextSession: string;
  dataWord: string;
  roundWord: string;
  nextGp: string;
  countdownLabel: string;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  timesLabel: string;
  trackMap: string;
  startWord: string;
  clockwise: string;
  anticlockwise: string;
  seasonOver: string;
  noRacesYet: string;
  loadingRound: string;
  roundError: string;
  retry: string;
  noData: string;
  noQualiYet: string;
  raceNotRun: string;
  fetchError: string;
  driverStandings: string;
  constructorStandings: string;
  afterRound: string;
  liveSuffix: string;
  driver: string;
  team: string;
  pts: string;
  gap: string;
  pointsShort: string;
  liveCurrent: string;
  qualifying: string;
  race: string;
  best: string;
  interval: string;
  dnf: string;
  winner: string;
  second: string;
  third: string;
  lastRace: string;
  red: string;
  qualiLegend: string;
  laps: string;
  lapsPlural: string;
  time: string;
  raceLegendBefore: string;
  fastestLap: string;
  footerData: string;
  footerHobby: string;
  fp1: string;
  fp2: string;
  fp3: string;
  sprintQuali: string;
  sprint: string;
  demoNote: string;
  liveNoteNone: string;
  liveNoteOpen: string;
  liveNoteLocked: string;
}

const da: Copy = {
  langLabel: "sprog",
  skip: "spring til indhold",
  loadingSeason: "henter sæsondata …",
  metaDescription: "apex. pit wall. stilling, tider og seneste resultat. dansk tid.",
  live: "live",
  nextSession: "næste session",
  dataWord: "data",
  roundWord: "runde",
  nextGp: "næste grand prix · runde",
  countdownLabel: "nedtælling til løbsstart",
  days: "dage",
  hours: "timer",
  minutes: "min",
  seconds: "sek",
  timesLabel: "tider · dansk tid",
  trackMap: "banekort",
  startWord: "start",
  clockwise: "med uret",
  anticlockwise: "mod uret",
  seasonOver: "sæsonen er kørt",
  noRacesYet: "ingen løb endnu",
  loadingRound: "henter runden …",
  roundError: "kunne ikke hente runden.",
  retry: "prøv igen",
  noData: "ingen data",
  noQualiYet: "ingen kvalifikationsresultater endnu.",
  raceNotRun: "løbet er ikke kørt endnu.",
  fetchError: "kunne ikke hente data fra jolpica.",
  driverStandings: "kørerstilling",
  constructorStandings: "konstruktørstilling",
  afterRound: "efter r",
  liveSuffix: " · live",
  driver: "kører",
  team: "hold",
  pts: "pts",
  gap: "bag",
  pointsShort: "p",
  liveCurrent: "live · nuværende",
  qualifying: "kvalifikation",
  race: "løb",
  best: "bedste",
  interval: "int",
  dnf: "udgået",
  winner: "vinder",
  second: "2.",
  third: "3.",
  lastRace: "sidste løb",
  red: "rød",
  qualiLegend: " = hurtigste i runden · ude i q1: 17–22 · ude i q2: 11–16 · – = ingen tid",
  laps: "omg.",
  lapsPlural: "omg.",
  time: "tid",
  raceLegendBefore: "± = pladser vundet/tabt fra start · ",
  fastestLap: "hurtigste omgang",
  footerData: "data: jolpica f1 api · hentet",
  footerHobby: "hobbyside · ikke tilknyttet formel 1",
  fp1: "1. træning",
  fp2: "2. træning",
  fp3: "3. træning",
  sprintQuali: "sprint-kval.",
  sprint: "sprint",
  demoNote:
    "demo · optaget udsnit fra usa 2026. point er lagt oven i stillingen, så tallene er ikke officielle. åbn siden uden ?demo=live for den rigtige tavle.",
  liveNoteNone:
    "ingen live-sekundtider. openf1 kræver betaling mens sessionen kører. jolpica tjekkes ca. hvert 30. sek og kan halte.",
  liveNoteOpen:
    "openf1 · ca. hvert 8. sek. det her er gratis data, typisk først når sessionen ikke længere regnes som live hos dem.",
  liveNoteLocked:
    "openf1 live koster penge, og der er ingen nøgle i siden. tavlen falder tilbage til jolpica, som opdateres ca. hvert 30. sek.",
};

const en: Copy = {
  langLabel: "language",
  skip: "skip to content",
  loadingSeason: "loading the season …",
  metaDescription: "apex. pit wall. standings, times and the latest result. danish time.",
  live: "live",
  nextSession: "next session",
  dataWord: "data",
  roundWord: "round",
  nextGp: "next grand prix · round",
  countdownLabel: "countdown to the race start",
  days: "days",
  hours: "hours",
  minutes: "min",
  seconds: "sec",
  timesLabel: "times · danish time",
  trackMap: "track map",
  startWord: "start",
  clockwise: "clockwise",
  anticlockwise: "anticlockwise",
  seasonOver: "the season is over",
  noRacesYet: "no races yet",
  loadingRound: "loading the round …",
  roundError: "could not load that round.",
  retry: "try again",
  noData: "no data",
  noQualiYet: "no qualifying results yet.",
  raceNotRun: "the race has not been run yet.",
  fetchError: "could not load data from jolpica.",
  driverStandings: "driver standings",
  constructorStandings: "constructor standings",
  afterRound: "after r",
  liveSuffix: " · live",
  driver: "driver",
  team: "team",
  pts: "pts",
  gap: "gap",
  pointsShort: "p",
  liveCurrent: "live · current",
  qualifying: "qualifying",
  race: "race",
  best: "best",
  interval: "int",
  dnf: "dnf",
  winner: "winner",
  second: "2nd",
  third: "3rd",
  lastRace: "last race",
  red: "red",
  qualiLegend: " = fastest in the session · out in q1: 17–22 · out in q2: 11–16 · – = no time",
  laps: "lap",
  lapsPlural: "laps",
  time: "time",
  raceLegendBefore: "± = places gained/lost from the start · ",
  fastestLap: "fastest lap",
  footerData: "data: jolpica f1 api · fetched",
  footerHobby: "hobby project · not affiliated with formula 1",
  fp1: "fp1",
  fp2: "fp2",
  fp3: "fp3",
  sprintQuali: "sprint quali",
  sprint: "sprint",
  demoNote:
    "demo · recorded sample from the 2026 united states gp. points are added on top of the standings, so the numbers are not official. open the page without ?demo=live for the real board.",
  liveNoteNone:
    "no live lap times. openf1 charges while the session is running. jolpica is checked about every 30 seconds and can lag.",
  liveNoteOpen:
    "openf1 · about every 8 seconds. this is the free data, usually only after they no longer treat the session as live.",
  liveNoteLocked:
    "openf1 live costs money, and this page has no key. the board falls back to jolpica, which updates about every 30 seconds.",
};

export const copy: Record<Lang, Copy> = { da, en };

const SESSION_KEY: Record<SessionKind, keyof Copy> = {
  practice1: "fp1",
  practice2: "fp2",
  practice3: "fp3",
  sprintQualifying: "sprintQuali",
  sprint: "sprint",
  qualifying: "qualifying",
  race: "race",
};

export function sessionName(text: Copy, kind: SessionKind): string {
  return text[SESSION_KEY[kind]];
}

export function lapUnit(text: Copy, count: number): string {
  return count === 1 ? text.laps : text.lapsPlural;
}

export function parseLang(value: string | null): Lang | null {
  if (value === "da" || value === "en") return value;
  return null;
}

/** Adressen vinder over det gemte valg. Ellers dansk. */
export function resolveLang(query: string | null, stored: string | null): Lang {
  return parseLang(query) ?? parseLang(stored) ?? "da";
}

export const LANG_STORAGE_KEY = "apex.lang";
