import type { Lang } from "./i18n.ts";

/** Dansk tid. Sommertid klares af Intl, ikke af et fast timetal. */
export const COPENHAGEN_TZ = "Europe/Copenhagen";

const NAME_LOCALE: Record<Lang, string> = { da: "da-DK", en: "en-GB" };

const WEEKDAYS = ["søn", "man", "tir", "ons", "tor", "fre", "lør"] as const;
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};
const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: COPENHAGEN_TZ,
  weekday: "short",
  day: "numeric",
  month: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const offsetFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: COPENHAGEN_TZ,
  timeZoneName: "shortOffset",
  hour: "2-digit",
});

export interface CopenhagenParts {
  weekday: (typeof WEEKDAYS)[number];
  day: number;
  month: number;
  hour: string;
  minute: string;
}

export function copenhagenParts(instant: Date): CopenhagenParts | null {
  if (Number.isNaN(instant.getTime())) return null;
  const parts = partsFormat.formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = WEEKDAY_INDEX[get("weekday")];
  const day = Number(get("day"));
  const month = Number(get("month"));
  if (weekday === undefined || !day || !month) return null;
  return {
    weekday: WEEKDAYS[weekday] ?? "man",
    day,
    month,
    hour: get("hour"),
    minute: get("minute"),
  };
}

function localeNames(instant: Date, lang: Lang): { weekday: string; month: string } | null {
  const parts = new Intl.DateTimeFormat(NAME_LOCALE[lang], {
    timeZone: COPENHAGEN_TZ,
    weekday: "short",
    month: "short",
  }).formatToParts(instant);
  const clean = (type: string) =>
    (parts.find((part) => part.type === type)?.value ?? "").replaceAll(".", "").toLowerCase();
  const weekday = clean("weekday");
  const month = clean("month");
  if (!weekday || !month) return null;
  return { weekday, month };
}

/** "19:30". Altid dansk tid, uanset sprog. */
export function formatDanishClock(iso: string): string {
  const parts = copenhagenParts(new Date(iso));
  if (!parts) return "–";
  return `${parts.hour}:${parts.minute}`;
}

/** "fre 30 okt" eller "sun  1 nov". Klokkeslættet er stadig dansk tid. */
export function formatDanishDay(iso: string, lang: Lang = "da"): string {
  const instant = new Date(iso);
  const parts = copenhagenParts(instant);
  const names = localeNames(instant, lang);
  if (!parts || !names) return "–";
  return `${names.weekday} ${String(parts.day).padStart(2, " ")} ${names.month}`;
}

/** "28 okt 20:45" */
export function formatFetchedAt(instant: Date, lang: Lang = "da"): string {
  const parts = copenhagenParts(instant);
  const names = localeNames(instant, lang);
  if (!parts || !names) return "–";
  return `${parts.day} ${names.month} ${parts.hour}:${parts.minute}`;
}

export function copenhagenOffsetMinutes(instant: Date): number {
  const name =
    offsetFormat.formatToParts(instant).find((part) => part.type === "timeZoneName")?.value ?? "";
  const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? "0"));
}
