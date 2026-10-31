import fixture from "./timing-fixture.json";
import type { PointsKind } from "../logic/points.ts";
import type { SampleDriver } from "./sample.ts";

/** Record-separatoren i SignalR JSON-protokollen. */
export const RECORD = "\u001e";

export const LIVE_TIMING_URL = "wss://livetiming.formula1.com/signalrcore";

export const TIMING_TOPICS = [
  "SessionInfo",
  "SessionStatus",
  "TrackStatus",
  "DriverList",
  "TimingData",
  "LapCount",
  "TimingAppData",
] as const;

export const HANDSHAKE = `{"protocol":"json","version":1}${RECORD}`;

export function subscribeFrame(): string {
  return `${JSON.stringify({
    type: 1,
    invocationId: "0",
    target: "Subscribe",
    arguments: [TIMING_TOPICS],
  })}${RECORD}`;
}

export interface TimingState {
  SessionInfo?: Record<string, unknown>;
  SessionStatus?: Record<string, unknown>;
  TimingData?: Record<string, unknown>;
  DriverList?: Record<string, unknown>;
  [topic: string]: unknown;
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Flet et feed-patch ind i et snapshot.
 * Talnøgler opdaterer lister. `_kf` skifter hele knuden ud.
 * `_deleted` fjerner felter, som timingen ikke længere sender.
 */
export function deepMerge(base: unknown, patch: unknown): unknown {
  if (!isRecord(patch)) return patch;
  const deleted = Array.isArray(patch._deleted)
    ? patch._deleted.filter((key): key is string => typeof key === "string")
    : [];
  const keyframe = patch._kf === true;
  const keys = Object.keys(patch).filter((key) => key !== "_kf" && key !== "_deleted");

  if (Array.isArray(base) && !keyframe && keys.every((key) => /^\d+$/.test(key))) {
    const next = base.slice();
    for (const key of keys) {
      const index = Number(key);
      next[index] = deepMerge(next[index], patch[key]);
    }
    return next;
  }

  const start: Record<string, unknown> = !keyframe && isRecord(base) ? { ...base } : {};
  for (const key of deleted) delete start[key];
  for (const key of keys) start[key] = deepMerge(start[key], patch[key]);
  return start;
}

export function parseFrames(buffer: string): { messages: unknown[]; rest: string } {
  const parts = buffer.split(RECORD);
  const rest = parts.pop() ?? "";
  const messages: unknown[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    try {
      messages.push(JSON.parse(trimmed) as unknown);
    } catch {
      // Et ødelagt frame springes over. Næste snapshot retter tilstanden.
    }
  }
  return { messages, rest };
}

export function reduceTiming(state: TimingState, message: unknown): TimingState {
  if (!isRecord(message)) return state;
  if (message.type === 3 && isRecord(message.result)) {
    return deepMerge({}, message.result) as TimingState;
  }
  if (message.type === 1 && message.target === "feed" && Array.isArray(message.arguments)) {
    const [topic, delta] = message.arguments;
    if (typeof topic !== "string" || !isRecord(delta)) return state;
    return { ...state, [topic]: deepMerge(state[topic], delta) } as TimingState;
  }
  return state;
}

const CODE_TO_ID: Record<string, string> = {
  ANT: "antonelli",
  RUS: "russell",
  HAM: "hamilton",
  VER: "max_verstappen",
  LEC: "leclerc",
  NOR: "norris",
  PIA: "piastri",
  HAD: "hadjar",
  LAW: "lawson",
  GAS: "gasly",
  LIN: "lindblad",
  COL: "colapinto",
  BEA: "bearman",
  HUL: "hulkenberg",
  BOR: "bortoleto",
  OCO: "ocon",
  ALO: "alonso",
  SAI: "sainz",
  ALB: "albon",
  TSU: "tsunoda",
  STR: "stroll",
  BOT: "bottas",
  PER: "perez",
  HIR: "hirakawa",
};

function teamIdFromName(name: string): string {
  const key = name.toLowerCase();
  if (key.includes("red bull")) return "red_bull";
  if (key.includes("racing bull")) return "rb";
  if (key.includes("mercedes")) return "mercedes";
  if (key.includes("ferrari")) return "ferrari";
  if (key.includes("mclaren")) return "mclaren";
  if (key.includes("alpine")) return "alpine";
  if (key.includes("haas")) return "haas";
  if (key.includes("audi") || key.includes("sauber")) return "audi";
  if (key.includes("williams")) return "williams";
  if (key.includes("aston")) return "aston_martin";
  if (key.includes("cadillac")) return "cadillac";
  return "";
}

function textValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (isRecord(value) && (typeof value.Value === "string" || typeof value.Value === "number")) {
    return textValue(value.Value);
  }
  return "";
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];
  return Object.keys(value)
    .filter((key) => /^\d+$/.test(key))
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => value[key]);
}

export type TimingMode = "times" | "race";

export interface TimingBoard {
  mode: TimingMode;
  segment: string;
  rows: SampleDriver[];
  hasTimes: boolean;
  points: PointsKind;
}

function sessionLabel(state: TimingState): string {
  const info = state.SessionInfo;
  if (!isRecord(info)) return "";
  return textValue(info.Type) || textValue(info.Name);
}

function timingMode(state: TimingState): TimingMode {
  const label = sessionLabel(state).toLowerCase();
  if (/qualif|shootout/.test(label)) return "times";
  if (/race/.test(label)) return "race";
  if (/sprint/.test(label)) return "race";
  const lines = linesOf(state);
  if (lines.some((line) => "GapToLeader" in line || "IntervalToPositionAhead" in line)) {
    return "race";
  }
  return "times";
}

function linesOf(state: TimingState): Array<Record<string, unknown>> {
  const timing = state.TimingData;
  if (!isRecord(timing) || !isRecord(timing.Lines)) return [];
  return Object.values(timing.Lines).filter(isRecord);
}

function sessionPart(state: TimingState): number {
  const timing = state.TimingData;
  const part = isRecord(timing) ? Number(timing.SessionPart) : NaN;
  return part >= 1 && part <= 3 ? part : 0;
}

function colourOf(value: unknown): string | undefined {
  const raw = textValue(value).replace("#", "");
  return /^[0-9a-f]{6}$/i.test(raw) ? `#${raw.toLowerCase()}` : undefined;
}

function rawGap(value: unknown): number | string {
  const text = textValue(value);
  if (text.toUpperCase() === "LEADER") return 0;
  return text;
}

export function mapTiming(state: TimingState): TimingBoard {
  const mode = timingMode(state);
  const part = sessionPart(state);
  const segment = mode === "times" && part > 0 ? `Q${part}` : "";
  const partIndex = part > 0 ? part - 1 : 0;
  const drivers = isRecord(state.DriverList) ? state.DriverList : {};
  const rows = linesOf(state)
    .map((line) => {
      const number = textValue(line.RacingNumber);
      const driver = isRecord(drivers[number]) ? drivers[number] : {};
      const code = textValue(driver.Tla) || number;
      const bests = asList(line.BestLapTimes).map((item) =>
        textValue(isRecord(item) ? item.Value : item),
      );
      const stats = asList(line.Stats).map((item) => (isRecord(item) ? item : {}));
      const currentBest = bests[partIndex] || "";
      const sessionBest = textValue(isRecord(line.BestLapTime) ? line.BestLapTime.Value : "");
      const bestLap = mode === "times" && part > 0 ? currentBest : currentBest || sessionBest;
      const stat = stats[partIndex] ?? {};
      const knockedOut = line.KnockedOut === true;
      const retired = line.Retired === true;
      const gapSource = mode === "race" ? line.GapToLeader : stat.TimeDiffToFastest;
      const intervalSource =
        mode === "race" ? line.IntervalToPositionAhead : stat.TimeDifftoPositionAhead;
      const teamName = textValue(driver.TeamName);
      const row: SampleDriver = {
        driverId: CODE_TO_ID[code] ?? textValue(driver.LastName).toLowerCase(),
        code,
        teamId: teamIdFromName(teamName),
        gap: rawGap(gapSource),
        interval: rawGap(intervalSource),
        retired,
        bestLap: bestLap || undefined,
        knockedOut,
        inPit: line.InPit === true,
        pitOut: line.PitOut === true,
        laps: Number.isFinite(Number(line.NumberOfLaps)) ? Number(line.NumberOfLaps) : undefined,
        colour: colourOf(driver.TeamColour),
      };
      return { row, position: Number(line.Position) || 999 };
    })
    .sort((a, b) => a.position - b.position)
    .map((item) => item.row);

  let leaderSeen = false;
  for (const row of rows) {
    if (row.gap === 0) {
      leaderSeen = true;
      continue;
    }
    if (typeof row.gap === "string" && row.gap === "") {
      if (!leaderSeen && row.bestLap) {
        row.gap = 0;
        leaderSeen = true;
      }
    }
  }

  const label = sessionLabel(state).toLowerCase();
  const points: PointsKind =
    label.includes("sprint") && !/qualif|shootout/.test(label) ? "sprint" : "race";
  const hasTimes = rows.some((row) => {
    if (row.bestLap) return true;
    if (typeof row.gap === "number") return true;
    if (typeof row.gap === "string" && row.gap !== "") return true;
    return false;
  });
  return { mode, segment, rows, hasTimes, points };
}

/** Optaget Q2 fra Mexico 2026, plus ét rigtigt positions-patch. */
export const DEMO_SNAPSHOT = fixture.snapshot as unknown as TimingState;
export const DEMO_PATCH = fixture.patch as unknown as Json;

export function demoTiming(step: number): TimingState {
  const base = reduceTiming({}, { type: 3, result: DEMO_SNAPSHOT });
  if (step % 2 === 0) return base;
  return reduceTiming(base, DEMO_PATCH);
}

export interface LiveTimingOptions {
  url?: string;
  onState: (state: TimingState) => void;
  onStatus?: (status: "live" | "down") => void;
  socket?: typeof WebSocket;
  silenceMs?: number;
}

/** Rå WebSocket. Ingen negotiate, for det kald har ikke CORS. */
export function openLiveTiming(options: LiveTimingOptions): { close: () => void } {
  const WS = options.socket ?? WebSocket;
  const url = options.url ?? LIVE_TIMING_URL;
  const silenceMs = options.silenceMs ?? 45_000;
  let stopped = false;
  let socket: WebSocket | null = null;
  let silence = 0;
  let attempt = 0;
  let state: TimingState = {};
  let buffer = "";

  const armSilence = () => {
    globalThis.clearTimeout(silence);
    silence = globalThis.setTimeout(() => socket?.close(), silenceMs);
  };

  const connect = () => {
    if (stopped) return;
    const ws = new WS(url);
    socket = ws;
    ws.addEventListener("open", () => {
      attempt = 0;
      buffer = "";
      state = {};
      ws.send(HANDSHAKE);
      armSilence();
    });
    ws.addEventListener("message", (event) => {
      armSilence();
      buffer += String(event.data);
      const parsed = parseFrames(buffer);
      buffer = parsed.rest;
      let changed = false;
      for (const message of parsed.messages) {
        if (isRecord(message) && message.type === 6) {
          ws.send(`{"type":6}${RECORD}`);
          continue;
        }
        if (isRecord(message) && message.type == null && Object.keys(message).length === 0) {
          ws.send(subscribeFrame());
          options.onStatus?.("live");
          continue;
        }
        const next = reduceTiming(state, message);
        if (next !== state) {
          state = next;
          changed = true;
        }
      }
      if (changed) options.onState(state);
    });
    ws.addEventListener("close", () => {
      globalThis.clearTimeout(silence);
      if (stopped) return;
      options.onStatus?.("down");
      const wait = Math.min(15_000, 1000 * 2 ** attempt);
      attempt += 1;
      globalThis.setTimeout(connect, wait);
    });
    ws.addEventListener("error", () => ws.close());
  };

  connect();
  return {
    close() {
      stopped = true;
      globalThis.clearTimeout(silence);
      socket?.close();
    },
  };
}
