import { describe, expect, test } from "bun:test";
import type { BoardData } from "../src/data/jolpica.ts";
import { markup } from "../src/html.ts";
import { copy } from "../src/logic/i18n.ts";
import { renderBoard, type LiveOverlay, type ResultsPane } from "../src/render.ts";

const now = new Date("2026-10-28T12:00:00Z");

function board(): BoardData {
  return {
    weekends: [
      {
        round: 1,
        name: "Bahrain Grand Prix",
        circuitId: "missing",
        circuitName: "Bahrain",
        raceStart: "2026-03-01T15:00:00Z",
        sessions: [],
      },
      {
        round: 2,
        name: "Miami Grand Prix",
        circuitId: "missing",
        circuitName: "Miami International Autodrome",
        raceStart: "2026-05-03T20:00:00Z",
        sessions: [],
      },
      {
        round: 3,
        name: "Mexico City Grand Prix",
        circuitId: "missing",
        circuitName: "Autódromo Hermanos Rodríguez",
        raceStart: "2026-11-01T20:00:00Z",
        sessions: [{ kind: "race", label: "løb", start: "2026-11-01T20:00:00Z", race: true }],
      },
    ],
    drivers: {
      round: 2,
      rows: [
        { id: "antonelli", position: 1, familyName: "Antonelli", points: 25, teamId: "mercedes" },
      ],
    },
    constructors: {
      round: 2,
      rows: [{ position: 1, name: "Mercedes", points: 40, teamId: "mercedes" }],
    },
    focusRound: 2,
    qualiRound: 2,
    qualiName: "Miami Grand Prix",
    racePending: null,
    lastResult: { round: 2, name: "Miami Grand Prix", laps: 57, rows: [], podium: [] },
    qualifying: [
      {
        position: 1,
        familyName: "Antonelli",
        teamId: "mercedes",
        q1: "1:35.390",
        q2: "1:34.278",
        q3: "1:34.035",
      },
    ],
    result: { round: 2, name: "Miami Grand Prix", laps: 57, rows: [], podium: [] },
    fetchedAt: now.getTime(),
  };
}

describe("pit wall html", () => {
  test("uret har sekunder, og bag-kolonnen ikke skubbes af en pil", () => {
    const page = markup(renderBoard(board(), now));
    expect(page).toContain('data-cd="seconds"');
    expect(page).toContain("<small>sek</small>");
    expect(page).not.toMatch(/class="who">[^<]*<\/span>\s*>/);
    expect(page).toContain('role="listbox"');
    expect(page).toContain("r2 · miami gp");
    expect(page).toContain("r1 · bahrain gp");
    expect(page).not.toContain("r3 ·");
    expect(page).toContain(">bag<");
    expect(page).toContain("tider · dansk tid");
    expect(page).toMatch(/data-lang="da"[^>]*aria-pressed="true"/);
  });

  test("engelsk bruger de samme felter og dansk tid", () => {
    const page = markup(renderBoard(board(), now, null, null, "en"));
    expect(page).toContain("<small>days</small>");
    expect(page).toContain("<small>sec</small>");
    expect(page).toContain("times · danish time");
    expect(page).toContain("sun  1 nov");
    expect(page).toContain(">21:00<");
    expect(page).toContain("driver standings");
    expect(page).toContain(">gap<");
    expect(page).toContain(">race<");
    expect(page).toContain("qualifying");
    expect(page).toMatch(/data-lang="en"[^>]*aria-pressed="true"/);
    expect(page).not.toContain("tider · dansk tid");
  });

  test("en valgt runde står i menuen", () => {
    const pane: ResultsPane = {
      round: 1,
      liveDefault: false,
      status: "ready",
      qualifying: [],
      result: { round: 1, name: "Bahrain Grand Prix", laps: 57, rows: [], podium: [] },
    };
    const page = markup(renderBoard(board(), now, null, pane));
    expect(page).toContain('id="round-opt-1"');
    expect(page).toMatch(/id="round-opt-1"[^>]*aria-selected="true"/);
    expect(page).toContain("r1 · bahrain gp");
  });

  test("live er standard, når sessionen kører", () => {
    const live: LiveOverlay = {
      on: true,
      demo: false,
      label: "løb",
      segment: "",
      note: "live-note",
      quali: null,
      race: [
        {
          driverId: "antonelli",
          code: "ANT",
          teamId: "mercedes",
          gap: 0,
          interval: 0,
        },
      ],
      drivers: null,
      constructors: null,
    };
    const pane: ResultsPane = {
      round: null,
      liveDefault: true,
      status: "board",
      qualifying: [],
      result: null,
    };
    const page = markup(renderBoard(board(), now, live, pane));
    expect(page).toContain("live · nuværende");
    expect(page).toContain("live-note");
    expect(page).toMatch(/id="round-opt-live"[^>]*aria-selected="true"/);
  });

  test("en tom live-tavle siger at tiderne ikke er klar", () => {
    const live: LiveOverlay = {
      on: true,
      demo: false,
      feed: "delayed",
      label: "kvalifikation",
      segment: "Q2",
      note: "",
      quali: [],
      race: [],
      drivers: null,
      constructors: null,
    };
    const danish = markup(renderBoard(board(), now, live));
    const english = markup(renderBoard(board(), now, live, null, "en"));
    expect(danish).toContain(copy.da.liveUnavailable);
    expect(danish).toContain("forsinket");
    expect(english).toContain(copy.en.liveUnavailable);
    expect(english).toContain("delayed");
    expect(danish).not.toContain('<div class="t lb">');
  });
});
