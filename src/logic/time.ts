/**
 * Alle viste tidspunkter er danske.
 * Vi lægger ikke selv +1 eller +2 timer til. `Intl` kender sommertid
 * i Europe/Copenhagen, så skiftet i marts og oktober bliver rigtigt.
 */
export const COPENHAGEN_TZ = "Europe/Copenhagen";

const clockFormat = new Intl.DateTimeFormat("da-DK", {
  timeZone: COPENHAGEN_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateFormat = new Intl.DateTimeFormat("da-DK", {
  timeZone: COPENHAGEN_TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
});

const offsetFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: COPENHAGEN_TZ,
  timeZoneName: "shortOffset",
  hour: "2-digit",
});

function asDate(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Klokkeslæt i København, fx "21.00". */
export function formatDanishClock(iso: string): string {
  const date = asDate(iso);
  if (!date) return "–";
  const parts = clockFormat.formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}.${minute}`;
}

/** Kort dansk dato og klokkeslæt, fx "søn. 1. nov. kl. 21.00". */
export function formatDanishDateTime(iso: string): string {
  const date = asDate(iso);
  if (!date) return "–";
  return `${dateFormat.format(date)} kl. ${formatDanishClock(iso)}`;
}

/**
 * Offset i minutter for et bestemt øjeblik.
 * Positiv værdi betyder foran UTC. Bruges af testene til at låse sommertid.
 */
export function copenhagenOffsetMinutes(instant: Date): number {
  const name =
    offsetFormat.formatToParts(instant).find((part) => part.type === "timeZoneName")?.value ?? "";
  const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  return sign * (hours * 60 + minutes);
}
