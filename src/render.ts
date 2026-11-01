import circuits from "./data/circuits.json";
import type { BoardData, RacePending } from "./data/jolpica.ts";
import type {
  QualifyingRow,
  RaceResult,
  RaceResultRow,
  RaceWeekend,
  Session,
} from "./data/types.ts";
import { html, type SafeHtml } from "./html.ts";
import {
  countdownParts,
  fastestLap,
  formatPoints,
  gapText,
  pad2,
  placesDelta,
  pointsBar,
  raceShort,
  teamLabel,
} from "./logic/board.ts";
import type { ProjectedStanding } from "./logic/points.ts";
import { formatLiveGap, hasLiveTimes, type SampleDriver } from "./live/sample.ts";
import { teamColor } from "./logic/teams.ts";
import { copy, fill, lapUnit, sessionName, type Copy, type Lang } from "./logic/i18n.ts";
import { roundMenuLabel, selectableRounds } from "./logic/round.ts";
import { drawTrack } from "./logic/track.ts";
import { formatDanishClock, formatDanishDay, formatFetchedAt } from "./logic/time.ts";

const tracks = circuits as unknown as Record<
  string,
  { lengthM?: number; coordinates: [number, number][] }
>;

function kmText(meters: number, lang: Lang): string {
  return `${new Intl.NumberFormat(lang === "en" ? "en-GB" : "da-DK", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(meters / 1000)} km`;
}

export interface LiveOverlay {
  on: boolean;
  demo: boolean;
  /** "live" er den direkte strøm. "delayed" er OpenF1 eller Jolpica. */
  feed?: "live" | "delayed";
  label: string;
  segment: string;
  note: string;
  quali: SampleDriver[] | null;
  race: SampleDriver[] | null;
  drivers: ProjectedStanding[] | null;
  constructors: ProjectedStanding[] | null;
}

export interface ResultsPane {
  round: number | null;
  liveDefault: boolean;
  status: "board" | "ready" | "error";
  qualifying: QualifyingRow[];
  result: RaceResult | null;
  racePending?: RacePending | null;
}

export function renderBoard(
  board: BoardData,
  now: Date,
  live: LiveOverlay | null = null,
  pane: ResultsPane | null = null,
  lang: Lang = "da",
): SafeHtml {
  const text = copy[lang];
  const next =
    board.weekends.find((race) => new Date(race.raceStart).getTime() > now.getTime()) ?? null;
  const nextSession = next?.sessions.find(
    (session) => new Date(session.start).getTime() > now.getTime(),
  );
  const fetched = formatFetchedAt(new Date(board.fetchedAt), lang);
  const pulsing = Boolean(live?.on);
  const streaming = pulsing && live?.feed !== "delayed";
  const useLive = Boolean(live?.on) && (pane == null || pane.liveDefault);
  const qualiRows = pane?.status === "ready" ? pane.qualifying : board.qualifying;
  const raceResult = pane?.status === "ready" ? pane.result : board.result;
  const qualiMeta =
    pane?.status === "ready"
      ? {
          round: pane.round ?? board.qualiRound,
          name: pane.result?.name ?? pane.racePending?.name ?? board.qualiName,
        }
      : { round: board.qualiRound, name: board.qualiName };
  const pending = pane?.status === "ready" ? (pane.racePending ?? null) : board.racePending;
  const standingsLive = useLive ? live : null;
  const qualiLive = Boolean(useLive && live?.quali);
  const raceLive = Boolean(useLive && live?.race);
  const qualiMissing = qualiLive && !hasLiveTimes(live?.quali);
  const raceMissing = raceLive && !hasLiveTimes(live?.race);
  return html`
    <header class="top">
      <h1>apex<i>.</i> <span class="m">pit wall</span></h1>
      <p class="live">
        <span class="dot ${streaming ? "" : "off"}"></span
        >${pulsing && live?.feed === "delayed" ? text.delayed : text.live}
        ${
          pulsing
            ? html`<span class="x">· ${live?.demo ? "demo · " : ""}${live?.label ?? ""}</span>`
            : nextSession
              ? html`<span class="x"
                  >· ${text.nextSession}: ${sessionName(text, nextSession.kind)}
                  ${weekday(nextSession.start, lang)} ${formatDanishClock(nextSession.start)}</span
                >`
              : ""
        }
        · ${text.dataWord} ${fetched}<span class="cur"></span>
        ${langToggle(lang, text)}
      </p>
    </header>
    ${next ? hero(next, board.weekends.length, now, text, lang) : seasonOver(board, text)}
    ${roundPicker(board, live, pane, useLive, text)}
    ${
      pane?.status === "error"
        ? html`<p class="state">
            ${text.roundError} <button type="button" data-round-retry>${text.retry}</button>
          </p>`
        : qualiMissing && raceMissing
          ? unavailable(text)
          : html`<div class="grid" data-results>
              ${
                qualiLive
                  ? qualiMissing
                    ? unavailable(text)
                    : liveQuali(live as LiveOverlay, text)
                  : qualiRows.length > 0
                    ? qualifying(qualiRows, qualiMeta, text)
                    : html`<section>
                        <h2>${text.qualifying}<span>${text.coming}</span></h2>
                        <p class="note">${text.qualiNotRun}</p>
                      </section>`
              }
              ${
                raceLive
                  ? raceMissing
                    ? unavailable(text)
                    : liveRace(live as LiveOverlay, text)
                  : raceResult
                    ? raceTable(raceResult, text)
                    : pending
                      ? racePendingView(pending, text, lang)
                      : html`<section>
                          <h2>${text.race}<span>–</span></h2>
                          <p class="note">${text.raceNotRun}</p>
                        </section>`
              }
            </div>`
    }
    ${useLive && live?.note ? html`<p class="note">${live.note}</p>` : ""}
    <div class="grid">
      ${driverStandings(board, standingsLive, text)}
      <section>${constructorStandings(board, standingsLive, text)} ${podium(board, text)}</section>
    </div>
    <footer>
      <span>${text.footerData} ${fetched}</span>
      <span>${text.footerHobby}</span>
    </footer>
  `;
}

function langToggle(lang: Lang, text: Copy): SafeHtml {
  const button = (value: Lang) => html`
    <button
      type="button"
      class="langbtn"
      data-lang="${value}"
      lang="${value}"
      aria-pressed="${lang === value ? "true" : "false"}"
    >
      ${value}
    </button>
  `;
  return html`
    <span class="langs" role="group" aria-label="${text.langLabel}">
      ${button("da")}<span class="slash" aria-hidden="true">/</span>${button("en")}
    </span>
  `;
}

function roundPicker(
  board: BoardData,
  live: LiveOverlay | null,
  pane: ResultsPane | null,
  useLive: boolean,
  text: Copy,
): SafeHtml {
  const focus = board.focusRound || board.result?.round || board.lastResult?.round || 0;
  const numbers = selectableRounds(board.weekends, focus).slice().reverse();
  if (numbers.length === 0) return html``;
  const names = new Map(board.weekends.map((race) => [race.round, race.name]));
  const picked = pane?.round || (useLive ? null : focus);
  const label = picked == null ? text.liveCurrent : roundMenuLabel(picked, names.get(picked) ?? "");
  const option = (value: string, text: string, selected: boolean) => html`
    <li
      id="round-opt-${value}"
      role="option"
      data-round-option="${value}"
      aria-selected="${selected ? "true" : "false"}"
    >
      ${text}
    </li>
  `;
  return html`
    <div class="roundpick" data-round-picker>
      <label id="round-lbl" class="lbl" for="round-btn">${text.roundWord}</label>
      <button
        id="round-btn"
        type="button"
        class="roundbtn"
        data-round-button
        aria-haspopup="listbox"
        aria-expanded="false"
        aria-controls="round-list"
      >
        ${label}
      </button>
      <p class="m roundstatus" data-round-status></p>
      <ul
        id="round-list"
        class="roundlist"
        role="listbox"
        aria-labelledby="round-lbl"
        data-round-list
        hidden
        tabindex="-1"
      >
        ${live?.on ? option("live", text.liveCurrent, useLive) : ""}
        ${numbers.map((round) =>
          option(String(round), roundMenuLabel(round, names.get(round) ?? ""), round === picked),
        )}
      </ul>
    </div>
  `;
}

function weekday(iso: string, lang: Lang): string {
  const day = formatDanishDay(iso, lang);
  return day.split(" ")[0] ?? "";
}

function hero(race: RaceWeekend, total: number, now: Date, text: Copy, lang: Lang): SafeHtml {
  const parts = countdownParts(race.raceStart, now);
  const track = tracks[race.circuitId];
  const drawing = track ? drawTrack(track.coordinates) : null;
  const length = track?.lengthM ? kmText(track.lengthM, lang) : "";
  return html`
    <section class="hero">
      <div>
        <p class="lbl">${text.nextGp} <b>${race.round}</b>/${total}</p>
        <div
          class="cd"
          data-countdown
          data-at="${race.raceStart}"
          role="timer"
          aria-label="${text.countdownLabel}"
        >
          <span><b data-cd="days">${parts.days}</b><small>${text.days}</small></span>
          <span class="sep">:</span>
          <span><b data-cd="hours">${pad2(parts.hours)}</b><small>${text.hours}</small></span>
          <span class="sep">:</span>
          <span><b data-cd="minutes">${pad2(parts.minutes)}</b><small>${text.minutes}</small></span>
          <span class="sep">:</span>
          <span><b data-cd="seconds">${pad2(parts.seconds)}</b><small>${text.seconds}</small></span>
        </div>
        <p class="gp"><b>${race.name.toLowerCase()}</b></p>
        <p class="m">${race.circuitName.toLowerCase()}${length ? ` · ${length}` : ""}</p>
      </div>
      <div class="next">
        <div class="ses">
          <p class="lbl session-label">${text.timesLabel}</p>
          ${race.sessions.map((session) => sessionRow(session, now, text, lang))}
        </div>
        ${
          drawing
            ? html`<div>
                <svg
                  class="trk"
                  viewBox="${drawing.viewBox}"
                  role="img"
                  aria-label="${text.trackMap}, ${race.circuitName}"
                >
                  <path d="${drawing.outline}" vector-effect="non-scaling-stroke" />
                  <path class="sf" d="${drawing.startLine}" vector-effect="non-scaling-stroke" />
                </svg>
                <p class="trkcap">
                  <span class="sfmark">|</span> ${text.startWord} · →
                  ${drawing.clockwise ? text.clockwise : text.anticlockwise}
                </p>
              </div>`
            : ""
        }
      </div>
    </section>
  `;
}

function sessionRow(session: Session, now: Date, text: Copy, lang: Lang): SafeHtml {
  const done = new Date(session.start).getTime() <= now.getTime();
  const classes = [done ? "done" : "", !done && session.race ? "race" : ""]
    .filter(Boolean)
    .join(" ");
  return html`
    <p class="${classes}">
      <span class="m">${formatDanishDay(session.start, lang)}</span
      ><b>${formatDanishClock(session.start)}</b><span>${sessionName(text, session.kind)}</span>
    </p>
  `;
}

function seasonOver(board: BoardData, text: Copy): SafeHtml {
  const last = board.result;
  return html`
    <section class="hero">
      <div>
        <p class="lbl">${text.seasonOver}</p>
        <p class="gp"><b>${last ? last.name.toLowerCase() : text.noRacesYet}</b></p>
      </div>
    </section>
  `;
}

function changeMark(change: number): SafeHtml {
  if (change > 0) return html`<span class="up">▲${change}</span>`;
  if (change < 0) return html`<span class="dn">▼${-change}</span>`;
  return html``;
}

function driverStandings(board: BoardData, live: LiveOverlay | null, text: Copy): SafeHtml {
  const projected = live?.on ? live.drivers : null;
  const byId = new Map(board.drivers.rows.map((row) => [row.id, row]));
  const rows = projected
    ? projected.flatMap((item) => {
        const row = byId.get(item.id);
        return row
          ? [{ ...row, position: item.position, points: item.points, change: item.change }]
          : [];
      })
    : board.drivers.rows.map((row) => ({ ...row, change: 0 }));
  const leader = rows[0]?.points ?? 0;
  const tag = `${text.afterRound}${board.drivers.round}${projected ? text.liveSuffix : ""}`;
  return html`
    <section>
      <h2>${text.driverStandings}<span>${tag}</span></h2>
      <div class="t drv ${projected ? "shifting" : ""}">
        <p class="hd">
          <span>#</span><span></span><span>${text.driver}</span><span class="bar"></span
          ><span class="n">${text.pts}</span><span class="n">${text.gap}</span>
        </p>
        ${rows.map((row) => {
          const bar = pointsBar(row.points, leader);
          return html`<p style="--c:${teamColor(row.teamId)}">
            <span class="m">${row.position} ${changeMark(row.change)}</span>
            <span class="k"></span>
            <span class="who">${row.familyName.toLowerCase()}</span>
            <span class="bar">${bar.filled}<i>${bar.rest}</i></span>
            <span class="n"><b>${formatPoints(row.points)}</b></span>
            <span class="n m">${gapText(row.points, leader)}</span>
          </p>`;
        })}
      </div>
    </section>
  `;
}

function constructorStandings(board: BoardData, live: LiveOverlay | null, text: Copy): SafeHtml {
  const projected = live?.on ? live.constructors : null;
  const byId = new Map(board.constructors.rows.map((row) => [row.teamId, row]));
  const rows = projected
    ? projected.flatMap((item) => {
        const row = byId.get(item.id);
        return row
          ? [{ ...row, position: item.position, points: item.points, change: item.change }]
          : [];
      })
    : board.constructors.rows.map((row) => ({ ...row, change: 0 }));
  const leader = rows[0]?.points ?? 0;
  const tag = `${text.afterRound}${board.constructors.round}${projected ? text.liveSuffix : ""}`;
  return html`
    <h2>${text.constructorStandings}<span>${tag}</span></h2>
    <div class="t con ${projected ? "shifting" : ""}">
      <p class="hd">
        <span>#</span><span></span><span>${text.team}</span><span class="bar"></span
        ><span class="n">${text.pts}</span><span class="n">${text.gap}</span>
      </p>
      ${rows.map((row) => {
        const bar = pointsBar(row.points, leader);
        return html`<p style="--c:${teamColor(row.teamId)}">
          <span class="m">${row.position} ${changeMark(row.change)}</span>
          <span class="k"></span>
          <span class="who">${teamLabel(row.name)}</span>
          <span class="bar">${bar.filled}<i>${bar.rest}</i></span>
          <span class="n"><b>${formatPoints(row.points)}</b></span>
          <span class="n m">${gapText(row.points, leader)}</span>
        </p>`;
      })}
    </div>
  `;
}

function driverFlags(row: SampleDriver, text: Copy): SafeHtml {
  if (row.inPit) return html` <span class="m">${text.pitIn}</span>`;
  if (row.pitOut) return html` <span class="m">${text.pitOut}</span>`;
  if (row.knockedOut) return html` <span class="m">${text.knockedOut}</span>`;
  return html``;
}

function rowColour(row: SampleDriver): string {
  return row.colour ?? teamColor(row.teamId);
}

function unavailable(text: Copy): SafeHtml {
  return html`<section><p class="note empty-live">${text.liveUnavailable}</p></section>`;
}

function liveQuali(live: LiveOverlay, text: Copy): SafeHtml {
  const rows = live.quali ?? [];
  const best = rows.map((row) => row.bestLap).find(Boolean) ?? null;
  const word = live.feed === "delayed" ? text.delayed : text.live;
  return html`
    <section>
      <h2>${text.qualifying}<span>${live.segment ? `${live.segment} · ` : ""}${word}</span></h2>
      <div class="t lb">
        <p class="hd">
          <span>#</span><span></span><span>${text.driver}</span><span class="n">${text.best}</span
          ><span class="n">${text.gap}</span>
        </p>
        ${rows.map(
          (row, index) => html`
            <p class="${row.knockedOut ? "ko" : ""}" style="--c:${rowColour(row)}">
              <span class="m">${index + 1}</span><span class="k"></span
              ><span class="who">${row.code.toLowerCase()}${driverFlags(row, text)}</span
              ><span class="n"
                >${row.bestLap && row.bestLap === best ? html`<b class="hot">${row.bestLap}</b>` : (row.bestLap ?? "–")}</span
              ><span class="n m">${formatLiveGap(row.gap, (count) => lapUnit(text, count))}</span>
            </p>
          `,
        )}
      </div>
    </section>
  `;
}

function liveRace(live: LiveOverlay, text: Copy): SafeHtml {
  const rows = (live.race ?? []).filter((row) => !row.retired);
  const retired = (live.race ?? []).filter((row) => row.retired);
  const withLaps = (live.race ?? []).some((row) => row.laps != null);
  const word = live.feed === "delayed" ? text.delayed : text.live;
  const gapText = (value: SampleDriver["gap"]) =>
    formatLiveGap(value, (count) => lapUnit(text, count));
  return html`
    <section>
      <h2>${text.race}<span>${word}</span></h2>
      <div class="t lb ${withLaps ? "laps" : ""}">
        <p class="hd">
          <span>#</span><span></span
          ><span>${text.driver}</span
          >${withLaps ? html`<span class="n">${text.lapCol}</span>` : ""}<span class="n"
            >${text.gap}</span
          ><span class="n">${text.interval}</span>
        </p>
        ${rows.map(
          (row, index) => html`
            <p style="--c:${rowColour(row)}">
              <span class="m">${index + 1}</span><span class="k"></span
              ><span class="who">${row.code.toLowerCase()}${driverFlags(row, text)}</span
              >${withLaps ? html`<span class="n m">${row.laps ?? ""}</span>` : ""}<span class="n"
                >${gapText(row.gap)}</span
              ><span class="n m">${gapText(row.interval)}</span>
            </p>
          `,
        )}
        ${retired.map(
          (row) => html`
            <p class="ko" style="--c:${rowColour(row)}">
              <span class="m">–</span><span class="k"></span
              ><span class="who">${row.code.toLowerCase()}</span
              >${withLaps ? html`<span class="n m">${row.laps ?? ""}</span>` : ""}<span class="n m"
                >${text.dnf}</span
              ><span></span>
            </p>
          `,
        )}
      </div>
    </section>
  `;
}

function racePendingView(pending: RacePending, text: Copy, lang: Lang): SafeHtml {
  const day = formatDanishDay(pending.raceStart, lang).replaceAll(/\s+/g, " ").trim();
  const time = formatDanishClock(pending.raceStart);
  return html`
    <section>
      <h2>${text.race}<span>r${pending.round} · ${text.coming}</span></h2>
      <p class="note">${fill(text.raceWhen, { day, time })}</p>
    </section>
  `;
}

function podium(board: BoardData, text: Copy): SafeHtml {
  const result = board.lastResult ?? board.result;
  if (!result || result.podium.length === 0) return html``;
  const labels = [text.winner, text.second, text.third];
  return html`
    <h2>${text.lastRace}<span>r${result.round} · ${raceShort(result.name)}</span></h2>
    <div class="pod">
      ${result.podium.map(
        (step, index) => html`
          <div style="--c:${teamColor(step.teamId)}">
            <p class="m">${labels[index] ?? ""}</p>
            <p class="pod-name"><span class="k"></span> ${step.code}</p>
            <p class="m">${teamLabel(step.teamName)}</p>
          </div>
        `,
      )}
    </div>
  `;
}

function qualiCell(value: string | null, best: string | null, showDash: boolean): SafeHtml {
  if (!value) return showDash ? html`<span class="n m">–</span>` : html`<span></span>`;
  if (value === best) return html`<span class="n"><b class="hot">${value}</b></span>`;
  return html`<span class="n">${value}</span>`;
}

function qualifying(
  rows: QualifyingRow[],
  result: { round: number; name: string },
  text: Copy,
): SafeHtml {
  const best = {
    q1: fastestLap(rows.map((row) => row.q1)),
    q2: fastestLap(rows.map((row) => row.q2)),
    q3: fastestLap(rows.map((row) => row.q3)),
  };
  return html`
    <section>
      <h2>${text.qualifying}<span>r${result.round} · ${result.name.toLowerCase()}</span></h2>
      <div class="t q">
        <p class="hd">
          <span>#</span><span></span><span>${text.driver}</span><span class="n">q1</span
          ><span class="n">q2</span><span class="n">q3</span>
        </p>
        ${rows.map((row) => {
          const cut = row.position === 11 || row.position === 17 ? "cut" : "";
          return html`<p class="${cut}" style="--c:${teamColor(row.teamId)}">
            <span class="m">${row.position}</span><span class="k"></span
            ><span class="who">${row.familyName.toLowerCase()}</span
            >${qualiCell(row.q1, best.q1, false)}${qualiCell(row.q2, best.q2, row.position <= 15 && row.q1 != null && row.q2 == null)}${qualiCell(row.q3, best.q3, row.position <= 10 && row.q3 == null)}
          </p>`;
        })}
      </div>
      <p class="note"><b class="hot">${text.red}</b>${text.qualiLegend}</p>
    </section>
  `;
}

function raceTime(
  row: RaceResultRow,
  leaderLaps: number,
  text: Copy,
): { text: string; dim: boolean } {
  if (row.status === "Finished" && row.time) return { text: row.time, dim: false };
  if (row.status === "Lapped" || /^\+\d+ Laps?$/i.test(row.status)) {
    const behind = Math.max(1, leaderLaps - row.laps);
    return { text: `+${behind} ${lapUnit(text, behind)}`, dim: true };
  }
  return { text: text.dnf, dim: true };
}

function raceTable(result: { laps: number; rows: RaceResultRow[] }, text: Copy): SafeHtml {
  const leaderLaps = result.laps;
  return html`
    <section>
      <h2>${text.race}<span>${leaderLaps} ${lapUnit(text, leaderLaps)}</span></h2>
      <div class="t r">
        <p class="hd">
          <span>#</span><span></span><span>${text.driver}</span><span class="n">±</span
          ><span class="n">${text.time}</span><span class="n">${text.pointsShort}</span>
        </p>
        ${result.rows.map((row) => {
          const delta = placesDelta(row.grid, row.position);
          const time = raceTime(row, leaderLaps, text);
          return html`<p style="--c:${teamColor(row.teamId)}">
            <span class="m">${row.position ?? "–"}</span><span class="k"></span
            ><span class="who"
              >${row.familyName.toLowerCase()}${row.fastestLap ? html` <span class="fl">●</span>` : ""}</span
            ><span class="n ${delta.kind === "up" ? "up" : delta.kind === "down" ? "dn" : "m"}"
              >${delta.text}</span
            ><span class="n ${time.dim ? "m" : ""}">${time.text}</span
            ><span class="n"
              >${row.points > 0 ? html`<b>${formatPoints(row.points)}</b>` : ""}</span
            >
          </p>`;
        })}
      </div>
      <p class="note">${text.raceLegendBefore}<span class="fl">●</span> ${text.fastestLap}</p>
    </section>
  `;
}

export function errorView(lang: Lang = "da"): SafeHtml {
  const text = copy[lang];
  return html`
    <p class="state">${text.fetchError} <button type="button" data-retry>${text.retry}</button></p>
  `;
}
