import { loadBoard, type BoardData } from "./data/jolpica.ts";
import { markup } from "./html.ts";
import { fetchOpenF1Snapshot, findOpenF1Session } from "./live/openf1.ts";
import { SAMPLE_QUALI, SAMPLE_RACE, type SampleDriver } from "./live/sample.ts";
import { countdownParts, pad2 } from "./logic/board.ts";
import { awardSessionPoints, projectStandings, type PointsKind } from "./logic/points.ts";
import { activeSession, qualifyingSegment } from "./logic/window.ts";
import { errorView, renderBoard, type LiveOverlay } from "./render.ts";

const root = document.querySelector<HTMLElement>("#app");
const demo = new URLSearchParams(location.search).get("demo") === "live";

let countdownTimer = 0;
let refreshTimer = 0;
let shown = false;
let openF1Key: number | null = null;
let openF1Locked = false;

function tick(scope: ParentNode, targetIso: string): void {
  const parts = countdownParts(targetIso, new Date());
  const days = scope.querySelector<HTMLElement>("[data-cd='days']");
  const hours = scope.querySelector<HTMLElement>("[data-cd='hours']");
  const minutes = scope.querySelector<HTMLElement>("[data-cd='minutes']");
  if (days) days.textContent = String(parts.days);
  if (hours) hours.textContent = pad2(parts.hours);
  if (minutes) minutes.textContent = pad2(parts.minutes);
}

function mountCountdown(scope: ParentNode): void {
  window.clearInterval(countdownTimer);
  const node = scope.querySelector<HTMLElement>("[data-countdown]");
  const target = node?.dataset.at;
  if (!target) return;
  tick(scope, target);
  countdownTimer = window.setInterval(() => tick(scope, target), 1000);
}

function projectFrom(
  board: BoardData,
  rows: SampleDriver[],
  kind: PointsKind,
): Pick<LiveOverlay, "drivers" | "constructors"> {
  const awards = awardSessionPoints(
    kind,
    rows.map((row) => ({
      driverId: row.driverId,
      teamId: row.teamId,
      retired: Boolean(row.retired),
    })),
  );
  return {
    drivers: projectStandings(
      board.drivers.rows.map((row) => ({ id: row.id, points: row.points, position: row.position })),
      awards.map((row) => ({ id: row.driverId, points: row.points })),
    ),
    constructors: projectStandings(
      board.constructors.rows.map((row) => ({
        id: row.teamId,
        points: row.points,
        position: row.position,
      })),
      awards.map((row) => ({ id: row.teamId, points: row.points })),
    ),
  };
}

function demoOverlay(board: BoardData): LiveOverlay {
  const projected = projectFrom(board, SAMPLE_RACE, "race");
  return {
    on: true,
    demo: true,
    label: "løb",
    segment: "Q3",
    note: "demo · optaget udsnit fra usa 2026. point er lagt oven i stillingen, så tallene er ikke officielle. åbn siden uden ?demo=live for den rigtige tavle.",
    quali: SAMPLE_QUALI,
    race: SAMPLE_RACE,
    ...projected,
  };
}

async function liveOverlay(board: BoardData, now: Date): Promise<LiveOverlay | null> {
  const sessions = board.weekends.flatMap((weekend) => weekend.sessions);
  const active = activeSession(sessions, now);
  if (!active) return null;
  const weekend = board.weekends.find((race) =>
    race.sessions.some((session) => session.start === active.start && session.kind === active.kind),
  );
  const scoring = active.kind === "race" || active.kind === "sprint";
  const openName =
    active.kind === "race" ? "Race" : active.kind === "sprint" ? "Sprint" : "Qualifying";
  let rows: SampleDriver[] | null = null;
  let note =
    "ingen live-sekundtider. openf1 kræver betaling mens sessionen kører. jolpica tjekkes ca. hvert 30. sek og kan halte.";

  if (!openF1Locked && (scoring || active.kind === "qualifying")) {
    if (openF1Key == null) openF1Key = await findOpenF1Session(active.start, openName);
    if (openF1Key != null) {
      const snap = await fetchOpenF1Snapshot(openF1Key);
      if (snap.ok && snap.rows.length > 0) {
        rows = snap.rows;
        note =
          "openf1 · ca. hvert 8. sek. det her er gratis data, typisk først når sessionen ikke længere regnes som live hos dem.";
      } else if (!snap.ok && snap.reason === "locked") {
        openF1Locked = true;
        note =
          "openf1 live koster penge, og der er ingen nøgle i siden. tavlen falder tilbage til jolpica, som opdateres ca. hvert 30. sek.";
      }
    }
  }

  const includePoints = scoring && weekend != null && board.drivers.round < weekend.round;
  const projected =
    includePoints && rows
      ? projectFrom(board, rows, active.kind === "sprint" ? "sprint" : "race")
      : null;

  return {
    on: true,
    demo: false,
    label: active.label,
    segment: active.kind === "qualifying" ? qualifyingSegment(active.start, now) : "",
    note,
    quali: active.kind === "qualifying" ? (rows ?? []) : null,
    race: scoring ? (rows ?? []) : null,
    drivers: projected?.drivers ?? null,
    constructors: projected?.constructors ?? null,
  };
}

async function show(fresh: boolean): Promise<void> {
  if (!root) return;
  const scroll = window.scrollY;
  try {
    const now = new Date();
    const board = await loadBoard({ fresh });
    const live = demo ? demoOverlay(board) : await liveOverlay(board, now);
    root.innerHTML = markup(renderBoard(board, now, live));
    root.setAttribute("aria-busy", "false");
    mountCountdown(root);
    if (shown) window.scrollTo(0, scroll);
    shown = true;
    schedule(live?.on ?? false);
  } catch (error) {
    console.error(error);
    if (shown) return;
    root.innerHTML = markup(errorView());
    root.setAttribute("aria-busy", "false");
    root.querySelector("[data-retry]")?.addEventListener("click", () => {
      root.innerHTML = `<p class="state">henter sæsondata …</p>`;
      void show(true);
    });
  }
}

function schedule(live: boolean): void {
  window.clearInterval(refreshTimer);
  if (!live && !demo) return;
  const wait = demo ? 8_000 : openF1Locked ? 30_000 : 8_000;
  refreshTimer = window.setInterval(() => {
    void show(true);
  }, wait);
}

function registerServiceWorker(): void {
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => undefined);
  });
}

registerServiceWorker();
void show(false);
