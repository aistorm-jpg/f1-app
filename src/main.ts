import { loadBoard, loadRound, type BoardData } from "./data/jolpica.ts";
import { markup } from "./html.ts";
import { fetchOpenF1Snapshot, findOpenF1Session } from "./live/openf1.ts";
import { SAMPLE_QUALI, SAMPLE_RACE, type SampleDriver } from "./live/sample.ts";
import { countdownParts, pad2 } from "./logic/board.ts";
import { awardSessionPoints, projectStandings, type PointsKind } from "./logic/points.ts";
import { parseRoundQuery, selectableRounds } from "./logic/round.ts";
import { activeSession, qualifyingSegment } from "./logic/window.ts";
import { errorView, renderBoard, type LiveOverlay, type ResultsPane } from "./render.ts";

const root = document.querySelector<HTMLElement>("#app");
const demo = new URLSearchParams(location.search).get("demo") === "live";

let countdownTimer = 0;
let countdownDelay = 0;
let refreshTimer = 0;
let shown = false;
let openF1Key: number | null = null;
let openF1Locked = false;

function tick(scope: ParentNode, targetIso: string): void {
  const parts = countdownParts(targetIso, new Date());
  const days = scope.querySelector<HTMLElement>("[data-cd='days']");
  const hours = scope.querySelector<HTMLElement>("[data-cd='hours']");
  const minutes = scope.querySelector<HTMLElement>("[data-cd='minutes']");
  const seconds = scope.querySelector<HTMLElement>("[data-cd='seconds']");
  if (days) days.textContent = String(parts.days);
  if (hours) hours.textContent = pad2(parts.hours);
  if (minutes) minutes.textContent = pad2(parts.minutes);
  if (seconds) seconds.textContent = pad2(parts.seconds);
}

function mountCountdown(scope: ParentNode): void {
  window.clearInterval(countdownTimer);
  window.clearTimeout(countdownDelay);
  const node = scope.querySelector<HTMLElement>("[data-countdown]");
  const target = node?.dataset.at;
  if (!target) return;
  tick(scope, target);
  const delay = 1000 - (Date.now() % 1000);
  countdownDelay = window.setTimeout(() => {
    tick(scope, target);
    countdownTimer = window.setInterval(() => tick(scope, target), 1000);
  }, delay);
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

function writeRoundUrl(round: number | null): void {
  const params = new URLSearchParams(location.search);
  const raw = params.get("runde");
  if (round == null) {
    if (!raw) return;
    params.delete("runde");
  } else if (raw === String(round)) return;
  else params.set("runde", String(round));
  const query = params.toString();
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
}

async function show(fresh: boolean): Promise<void> {
  if (!root) return;
  const scroll = window.scrollY;
  try {
    const now = new Date();
    const board = await loadBoard({ fresh });
    const rounds = selectableRounds(board.weekends, board.result?.round ?? 0);
    const params = new URLSearchParams(location.search);
    const queried = parseRoundQuery(params.get("runde"), rounds);
    if (params.get("runde") && queried == null) writeRoundUrl(null);
    const live = demo ? demoOverlay(board) : await liveOverlay(board, now);
    const liveOn = Boolean(live?.on);
    let pane: ResultsPane | null = null;
    if (liveOn && queried == null) {
      pane = { round: null, liveDefault: true, status: "board", qualifying: [], result: null };
    } else if (queried != null && queried !== board.result?.round) {
      const status = root.querySelector("[data-round-status]");
      if (status) status.textContent = "henter runden …";
      try {
        const loaded = await loadRound(queried, { fresh });
        pane = {
          round: queried,
          liveDefault: false,
          status: "ready",
          qualifying: loaded.qualifying,
          result: loaded.result,
        };
      } catch (error) {
        console.error(error);
        pane = {
          round: queried,
          liveDefault: false,
          status: "error",
          qualifying: [],
          result: null,
        };
      }
    } else if (queried != null) {
      pane = { round: queried, liveDefault: false, status: "board", qualifying: [], result: null };
    }
    root.innerHTML = markup(renderBoard(board, now, live, pane));
    root.setAttribute("aria-busy", "false");
    mountCountdown(root);
    if (shown) window.scrollTo(0, scroll);
    shown = true;
    schedule(liveOn && queried == null);
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
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => {
        void registration.update();
        if (registration.waiting) registration.waiting.postMessage("skip-waiting");
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              worker.postMessage("skip-waiting");
            }
          });
        });
      })
      .catch(() => undefined);
  });
}

function roundOptions(list: HTMLElement): HTMLElement[] {
  return [...list.querySelectorAll<HTMLElement>("[role='option']")];
}

function markRoundOption(options: HTMLElement[], index: number): void {
  const list = options[0]?.parentElement;
  options.forEach((item, itemIndex) => item.classList.toggle("on", itemIndex === index));
  const active = options[index];
  if (list && active) list.setAttribute("aria-activedescendant", active.id);
  active?.scrollIntoView({ block: "nearest" });
}

function closeRoundMenu(focusButton: boolean): void {
  if (!root) return;
  const list = root.querySelector<HTMLElement>("[data-round-list]");
  const button = root.querySelector<HTMLElement>("[data-round-button]");
  list?.setAttribute("hidden", "");
  button?.setAttribute("aria-expanded", "false");
  if (focusButton) button?.focus();
}

function openRoundMenu(): void {
  if (!root) return;
  const list = root.querySelector<HTMLElement>("[data-round-list]");
  const button = root.querySelector<HTMLElement>("[data-round-button]");
  if (!list || !button) return;
  list.removeAttribute("hidden");
  button.setAttribute("aria-expanded", "true");
  const options = roundOptions(list);
  const selected = options.findIndex((item) => item.getAttribute("aria-selected") === "true");
  markRoundOption(options, selected >= 0 ? selected : 0);
  list.focus();
}

function toggleRoundMenu(): void {
  const list = root?.querySelector<HTMLElement>("[data-round-list]");
  if (!list) return;
  if (list.hasAttribute("hidden")) openRoundMenu();
  else closeRoundMenu(false);
}

function applyRound(value: string): void {
  const params = new URLSearchParams(location.search);
  if (value === "live") params.delete("runde");
  else params.set("runde", value);
  const query = params.toString();
  const next = `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;
  const current = `${location.pathname}${location.search}${location.hash}`;
  if (next !== current) history.pushState(null, "", next);
  closeRoundMenu(false);
  void show(false);
}

function bindShell(): void {
  if (!root) return;
  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-round-retry]")) {
      void show(true);
      return;
    }
    const option = target.closest<HTMLElement>("[data-round-option]");
    if (option) {
      applyRound(option.dataset.roundOption ?? "");
      return;
    }
    if (target.closest("[data-round-button]")) {
      toggleRoundMenu();
      return;
    }
    if (!target.closest("[data-round-picker]")) closeRoundMenu(false);
  });
  root.addEventListener("keydown", (event) => {
    const list = root.querySelector<HTMLElement>("[data-round-list]");
    if (!list || list.hasAttribute("hidden")) {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-round-button]") &&
        (event.key === "ArrowDown" || event.key === "ArrowUp")
      ) {
        event.preventDefault();
        openRoundMenu();
      }
      return;
    }
    const options = roundOptions(list);
    const current = options.findIndex((item) => item.classList.contains("on"));
    if (event.key === "Escape") {
      event.preventDefault();
      closeRoundMenu(true);
      return;
    }
    if (event.key === "Tab") {
      closeRoundMenu(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const next = current < 0 ? 0 : (current + delta + options.length) % options.length;
      markRoundOption(options, next);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      markRoundOption(options, event.key === "Home" ? 0 : options.length - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const active = options[current] ?? options[0];
      if (active) applyRound(active.dataset.roundOption ?? "");
    }
  });
}

document.addEventListener("visibilitychange", () => {
  if (!root) return;
  if (document.visibilityState === "hidden") {
    window.clearInterval(countdownTimer);
    window.clearTimeout(countdownDelay);
    return;
  }
  mountCountdown(root);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.update())
      .catch(() => undefined);
  }
});

window.addEventListener("popstate", () => {
  void show(false);
});

bindShell();
registerServiceWorker();
void show(false);
