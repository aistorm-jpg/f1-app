import { describe, expect, test } from "bun:test";
import {
  DEMO_PATCH,
  DEMO_SNAPSHOT,
  HANDSHAKE,
  deepMerge,
  demoTiming,
  mapTiming,
  openLiveTiming,
  parseFrames,
  reduceTiming,
  subscribeFrame,
  type TimingState,
} from "../src/live/livetiming.ts";

describe("signalr-timing", () => {
  test("frames deles ved record-separatoren", () => {
    const raw = `${JSON.stringify({ type: 6 })}\u001e{"type":3,"result":{"ok":true}}\u001e{"type"`;
    const parsed = parseFrames(raw);
    expect(parsed.messages).toHaveLength(2);
    expect(parsed.rest).toBe('{"type"');
  });

  test("et patch fletter talnøgler ind i en liste og respekterer _deleted", () => {
    const base = {
      BestLapTimes: [{ Value: "1:17.733" }, { Value: "1:18.662" }, { Value: "" }],
      BestLapTime: { Value: "1:18.662", Lap: 5 },
    };
    const merged = deepMerge(base, {
      BestLapTimes: { 1: { Value: "" } },
      BestLapTime: { Value: "", _deleted: ["Lap"] },
    }) as {
      BestLapTimes: Array<{ Value: string }>;
      BestLapTime: { Value: string; Lap?: number };
    };
    expect(merged.BestLapTimes[0]?.Value).toBe("1:17.733");
    expect(merged.BestLapTimes[1]?.Value).toBe("");
    expect(merged.BestLapTime).toEqual({ Value: "" });
  });

  test("mexico-kval: q2, leclerc i spidsen, alonso ude", () => {
    const state = reduceTiming({}, { type: 3, result: DEMO_SNAPSHOT });
    const board = mapTiming(state);
    expect(board.mode).toBe("times");
    expect(board.segment).toBe("Q2");
    expect(board.hasTimes).toBe(true);
    expect(board.rows[0]?.code).toBe("LEC");
    expect(board.rows[0]?.bestLap).toBe("1:16.944");
    expect(board.rows[0]?.gap).toBe(0);
    const alonso = board.rows.find((row) => row.code === "ALO");
    expect(alonso?.knockedOut).toBe(true);
    expect(alonso?.bestLap).toBeUndefined();
    expect(alonso?.inPit).toBe(true);
  });

  test("et rigtigt positions-patch flytter antonelli", () => {
    const before = mapTiming(reduceTiming({}, { type: 3, result: DEMO_SNAPSHOT }));
    const after = mapTiming(reduceTiming(before && demoTiming(0), DEMO_PATCH));
    const earlier = before.rows.findIndex((row) => row.code === "ANT");
    const later = after.rows.findIndex((row) => row.code === "ANT");
    expect(earlier).toBeGreaterThan(0);
    expect(later).toBe(0);
    expect(after.rows[0]?.pitOut).toBe(true);
  });

  test("løb bruger gap, interval, omgange og udgået", () => {
    const state: TimingState = {
      SessionInfo: { Type: "Race" },
      TimingData: {
        Lines: {
          "1": {
            RacingNumber: "1",
            Position: "1",
            Retired: false,
            InPit: false,
            PitOut: false,
            NumberOfLaps: 40,
            GapToLeader: "",
            IntervalToPositionAhead: "",
            BestLapTime: { Value: "1:20.100" },
          },
          "16": {
            RacingNumber: "16",
            Position: "2",
            Retired: false,
            InPit: true,
            PitOut: false,
            NumberOfLaps: 40,
            GapToLeader: "+1.234",
            IntervalToPositionAhead: { Value: "+1.234" },
          },
          "63": {
            RacingNumber: "63",
            Position: "3",
            Retired: true,
            NumberOfLaps: 22,
            GapToLeader: "2 LAPS",
            IntervalToPositionAhead: "",
          },
        },
      },
      DriverList: {
        "1": { Tla: "NOR", LastName: "Norris", TeamName: "McLaren", TeamColour: "F47600" },
        "16": { Tla: "LEC", LastName: "Leclerc", TeamName: "Ferrari", TeamColour: "ED1131" },
        "63": { Tla: "RUS", LastName: "Russell", TeamName: "Mercedes", TeamColour: "00D7B6" },
      },
    };
    const board = mapTiming(state);
    expect(board.mode).toBe("race");
    expect(board.points).toBe("race");
    expect(board.rows.map((row) => row.code)).toEqual(["NOR", "LEC", "RUS"]);
    expect(board.rows[0]?.gap).toBe(0);
    expect(board.rows[1]?.gap).toBe("+1.234");
    expect(board.rows[1]?.inPit).toBe(true);
    expect(board.rows[1]?.laps).toBe(40);
    expect(board.rows[1]?.colour).toBe("#ed1131");
    expect(board.rows[2]?.retired).toBe(true);
    expect(board.rows[2]?.gap).toBe("2 LAPS");
  });

  test("sprint tæller sprint-point, og en tom q2 har ingen tider", () => {
    const sprint = mapTiming({
      SessionInfo: { Type: "Sprint" },
      TimingData: { Lines: {} },
      DriverList: {},
    });
    expect(sprint.points).toBe("sprint");
    expect(sprint.hasTimes).toBe(false);
    const empty = mapTiming({
      TimingData: {
        SessionPart: 2,
        Lines: { "1": { RacingNumber: "1", Position: "1", BestLapTimes: [{}, {}, {}] } },
      },
      DriverList: { "1": { Tla: "NOR", TeamName: "McLaren" } },
    });
    expect(empty.segment).toBe("Q2");
    expect(empty.hasTimes).toBe(false);
  });

  test("socket sender handshake og subscribe uden negotiate", () => {
    const sockets: FakeSocket[] = [];
    class FakeSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      url: string;
      sent: string[] = [];
      private listeners = new Map<string, Array<(event: { data?: string }) => void>>();
      constructor(url: string) {
        this.url = url;
        sockets.push(this);
        queueMicrotask(() => this.emit("open", {}));
      }
      addEventListener(type: string, listener: (event: { data?: string }) => void) {
        const list = this.listeners.get(type) ?? [];
        list.push(listener);
        this.listeners.set(type, list);
      }
      send(data: string) {
        this.sent.push(data);
      }
      close() {
        this.emit("close", {});
      }
      emit(type: string, event: { data?: string }) {
        for (const listener of this.listeners.get(type) ?? []) listener(event);
      }
    }

    const seen: TimingState[] = [];
    const handle = openLiveTiming({
      url: "wss://livetiming.formula1.com/signalrcore",
      socket: FakeSocket as unknown as typeof WebSocket,
      silenceMs: 60_000,
      onState: (state) => seen.push(state),
    });
    return new Promise<void>((resolve) => {
      queueMicrotask(() => {
        const socket = sockets[0];
        expect(socket?.url).toBe("wss://livetiming.formula1.com/signalrcore");
        expect(socket?.sent[0]).toBe(HANDSHAKE);
        socket?.emit("message", { data: `{}${String.fromCharCode(0x1e)}` });
        expect(socket?.sent[1]).toBe(subscribeFrame());
        expect(socket?.sent[1]).not.toContain("negotiate");
        const frame = `${JSON.stringify({ type: 3, result: DEMO_SNAPSHOT })}${String.fromCharCode(0x1e)}`;
        socket?.emit("message", { data: frame });
        expect(seen.length).toBe(1);
        expect(mapTiming(seen[0] ?? {}).segment).toBe("Q2");
        handle.close();
        resolve();
      });
    });
  });
});
