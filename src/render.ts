import circuits from "./data/circuits.json";
import type { BoardData } from "./data/jolpica.ts";
import type { QualifyingRow, RaceResultRow, RaceWeekend, Session } from "./data/types.ts";
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
import { formatLiveGap, type SampleDriver } from "./live/sample.ts";
import { teamColor } from "./logic/teams.ts";
import { drawTrack } from "./logic/track.ts";
import { formatDanishClock, formatDanishDay, formatFetchedAt } from "./logic/time.ts";

const tracks = circuits as unknown as Record<
  string,
  { lengthM?: number; coordinates: [number, number][] }
>;

const kmFormat = new Intl.NumberFormat("da-DK", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

export interface LiveOverlay {
  on: boolean;
  demo: boolean;
  label: string;
  segment: string;
  note: string;
  quali: SampleDriver[] | null;
  race: SampleDriver[] | null;
  drivers: ProjectedStanding[] | null;
  constructors: ProjectedStanding[] | null;
}

export function renderBoard(
  board: BoardData,
  now: Date,
  live: LiveOverlay | null = null,
): SafeHtml {
  const next =
    board.weekends.find((race) => new Date(race.raceStart).getTime() > now.getTime()) ?? null;
  const nextSession = next?.sessions.find(
    (session) => new Date(session.start).getTime() > now.getTime(),
  );
  const fetched = formatFetchedAt(new Date(board.fetchedAt));
  const pulsing = Boolean(live?.on);
  return html`
    <header class="top">
      <h1>apex<i>.</i> <span class="m">pit wall</span></h1>
      <p class="live">
        <span class="dot ${pulsing ? "" : "off"}"></span>live
        ${
          pulsing
            ? html`<span class="x">· ${live?.demo ? "demo · " : ""}${live?.label ?? ""}</span>`
            : nextSession
              ? html`<span class="x"
                  >· næste session: ${nextSession.label} ${weekday(nextSession.start)}
                  ${formatDanishClock(nextSession.start)}</span
                >`
              : ""
        }
        · data ${fetched}<span class="cur"></span>
      </p>
    </header>
    ${next ? hero(next, board.weekends.length, now) : seasonOver(board)}
    <div class="grid">
      ${
        live?.quali
          ? liveQuali(live)
          : board.result
            ? qualifying(board.qualifying, board.result)
            : html`<section>
                <h2>kvalifikation<span>ingen data</span></h2>
                <p class="note">ingen kvalifikationsresultater endnu.</p>
              </section>`
      }
      ${
        live?.race
          ? liveRace(live)
          : board.result
            ? raceTable(board.result)
            : html`<section>
                <h2>løb<span>–</span></h2>
                <p class="note">løbet er ikke kørt endnu.</p>
              </section>`
      }
    </div>
    ${live?.note ? html`<p class="note">${live.note}</p>` : ""}
    <div class="grid">
      ${driverStandings(board, live)}
      <section>${constructorStandings(board, live)} ${podium(board)}</section>
    </div>
    <footer>
      <span>data: jolpica f1 api · hentet ${fetched}</span>
      <span>hobbyside · ikke tilknyttet formel 1</span>
    </footer>
  `;
}

function weekday(iso: string): string {
  const day = formatDanishDay(iso);
  return day.split(" ")[0] ?? "";
}

function hero(race: RaceWeekend, total: number, now: Date): SafeHtml {
  const parts = countdownParts(race.raceStart, now);
  const track = tracks[race.circuitId];
  const drawing = track ? drawTrack(track.coordinates) : null;
  const length = track?.lengthM ? `${kmFormat.format(track.lengthM / 1000)} km` : "";
  return html`
    <section class="hero">
      <div>
        <p class="lbl">næste grand prix · runde <b>${race.round}</b>/${total}</p>
        <div
          class="cd"
          data-countdown
          data-at="${race.raceStart}"
          role="timer"
          aria-label="nedtælling til løbsstart"
        >
          <span><b data-cd="days">${parts.days}</b><small>dage</small></span>
          <span class="sep">:</span>
          <span><b data-cd="hours">${pad2(parts.hours)}</b><small>timer</small></span>
          <span class="sep">:</span>
          <span><b data-cd="minutes">${pad2(parts.minutes)}</b><small>min</small></span>
        </div>
        <p class="gp"><b>${race.name.toLowerCase()}</b></p>
        <p class="m">${race.circuitName.toLowerCase()}${length ? ` · ${length}` : ""}</p>
      </div>
      <div class="next">
        <div class="ses">
          <p class="lbl session-label">tider · dansk tid</p>
          ${race.sessions.map((session) => sessionRow(session, now))}
        </div>
        ${
          drawing
            ? html`<div>
                <svg
                  class="trk"
                  viewBox="${drawing.viewBox}"
                  role="img"
                  aria-label="banekort, ${race.circuitName}"
                >
                  <path d="${drawing.outline}" vector-effect="non-scaling-stroke" />
                  <path class="sf" d="${drawing.startLine}" vector-effect="non-scaling-stroke" />
                </svg>
                <p class="trkcap">
                  <span class="sfmark">|</span> start · →
                  ${drawing.clockwise ? "med uret" : "mod uret"}
                </p>
              </div>`
            : ""
        }
      </div>
    </section>
  `;
}

function sessionRow(session: Session, now: Date): SafeHtml {
  const done = new Date(session.start).getTime() <= now.getTime();
  const classes = [done ? "done" : "", !done && session.race ? "race" : ""]
    .filter(Boolean)
    .join(" ");
  return html`
    <p class="${classes}">
      <span class="m">${formatDanishDay(session.start)}</span
      ><b>${formatDanishClock(session.start)}</b><span>${session.label}</span>
    </p>
  `;
}

function seasonOver(board: BoardData): SafeHtml {
  const last = board.result;
  return html`
    <section class="hero">
      <div>
        <p class="lbl">sæsonen er kørt</p>
        <p class="gp"><b>${last ? last.name.toLowerCase() : "ingen løb endnu"}</b></p>
      </div>
    </section>
  `;
}

function changeMark(change: number): SafeHtml {
  if (change > 0) return html`<span class="up">▲${change}</span>`;
  if (change < 0) return html`<span class="dn">▼${-change}</span>`;
  return html``;
}

function driverStandings(board: BoardData, live: LiveOverlay | null): SafeHtml {
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
  const tag = projected ? `efter r${board.drivers.round} · live` : `efter r${board.drivers.round}`;
  return html`
    <section>
      <h2>kørerstilling<span>${tag}</span></h2>
      <div class="t drv ${projected ? "shifting" : ""}">
        <p class="hd">
          <span>#</span><span></span><span>kører</span><span></span><span class="n">pts</span
          ><span class="n">bag</span>
        </p>
        ${rows.map((row) => {
          const bar = pointsBar(row.points, leader);
          return html`<p style="--c:${teamColor(row.teamId)}">
            <span class="m">${row.position} ${changeMark(row.change)}</span><span class="k"></span
            ><span>${row.familyName.toLowerCase()}</span> ><span class="bar"
              >${bar.filled}<i>${bar.rest}</i></span
            ><span class="n"><b>${formatPoints(row.points)}</b></span
            ><span class="n m">${gapText(row.points, leader)}</span>
          </p>`;
        })}
      </div>
    </section>
  `;
}

function constructorStandings(board: BoardData, live: LiveOverlay | null): SafeHtml {
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
  const tag = projected
    ? `efter r${board.constructors.round} · live`
    : `efter r${board.constructors.round}`;
  return html`
    <h2>konstruktørstilling<span>${tag}</span></h2>
    <div class="t con ${projected ? "shifting" : ""}">
      <p class="hd">
        <span>#</span><span></span><span>hold</span><span></span><span class="n">pts</span
        ><span class="n gap">bag</span>
      </p>
      ${rows.map((row) => {
        const bar = pointsBar(row.points, leader);
        return html`<p style="--c:${teamColor(row.teamId)}">
          <span class="m">${row.position} ${changeMark(row.change)}</span><span class="k"></span
          ><span>${teamLabel(row.name)}</span> ><span class="bar"
            >${bar.filled}<i>${bar.rest}</i></span
          ><span class="n"><b>${formatPoints(row.points)}</b></span
          ><span class="n m gap">${gapText(row.points, leader)}</span>
        </p>`;
      })}
    </div>
  `;
}

function liveQuali(live: LiveOverlay): SafeHtml {
  const rows = live.quali ?? [];
  const best = rows.map((row) => row.bestLap).find(Boolean) ?? null;
  return html`
    <section>
      <h2>kvalifikation<span>${live.segment} · live</span></h2>
      <div class="t lb">
        <p class="hd">
          <span>#</span><span></span><span>kører</span><span class="n">bedste</span
          ><span class="n">gap</span>
        </p>
        ${rows.map(
          (row, index) => html`
            <p style="--c:${teamColor(row.teamId)}">
              <span class="m">${index + 1}</span><span class="k"></span
              ><span>${row.code.toLowerCase()}</span>
              <span class="n"
                >${row.bestLap && row.bestLap === best ? html`<b class="hot">${row.bestLap}</b>` : (row.bestLap ?? "–")}</span
              >
              <span class="n m">${formatLiveGap(row.gap)}</span>
            </p>
          `,
        )}
      </div>
    </section>
  `;
}

function liveRace(live: LiveOverlay): SafeHtml {
  const rows = (live.race ?? []).filter((row) => !row.retired);
  const retired = (live.race ?? []).filter((row) => row.retired);
  return html`
    <section>
      <h2>løb<span>live</span></h2>
      <div class="t lb">
        <p class="hd">
          <span>#</span><span></span><span>kører</span><span class="n">gap</span
          ><span class="n">int</span>
        </p>
        ${rows.map(
          (row, index) => html`
            <p style="--c:${teamColor(row.teamId)}">
              <span class="m">${index + 1}</span><span class="k"></span
              ><span>${row.code.toLowerCase()}</span>
              <span class="n">${formatLiveGap(row.gap)}</span>
              <span class="n m">${formatLiveGap(row.interval)}</span>
            </p>
          `,
        )}
        ${retired.map(
          (row) => html`
            <p style="--c:${teamColor(row.teamId)}">
              <span class="m">–</span><span class="k"></span><span>${row.code.toLowerCase()}</span>
              <span class="n m">udgået</span><span></span>
            </p>
          `,
        )}
      </div>
    </section>
  `;
}

function podium(board: BoardData): SafeHtml {
  const result = board.result;
  if (!result || result.podium.length === 0) return html``;
  const labels = ["vinder", "2.", "3."];
  return html`
    <h2>sidste løb<span>r${result.round} · ${raceShort(result.name)}</span></h2>
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

function qualifying(rows: QualifyingRow[], result: { round: number; name: string }): SafeHtml {
  const best = {
    q1: fastestLap(rows.map((row) => row.q1)),
    q2: fastestLap(rows.map((row) => row.q2)),
    q3: fastestLap(rows.map((row) => row.q3)),
  };
  return html`
    <section>
      <h2>kvalifikation<span>r${result.round} · ${result.name.toLowerCase()}</span></h2>
      <div class="t q">
        <p class="hd">
          <span>#</span><span></span><span>kører</span><span class="n">q1</span
          ><span class="n">q2</span><span class="n">q3</span>
        </p>
        ${rows.map((row) => {
          const cut = row.position === 11 || row.position === 17 ? "cut" : "";
          return html`<p class="${cut}" style="--c:${teamColor(row.teamId)}">
            <span class="m">${row.position}</span><span class="k"></span
            ><span>${row.familyName.toLowerCase()}</span
            >${qualiCell(row.q1, best.q1, false)}${qualiCell(row.q2, best.q2, row.position <= 15 && row.q1 != null && row.q2 == null)}${qualiCell(row.q3, best.q3, row.position <= 10 && row.q3 == null)}
          </p>`;
        })}
      </div>
      <p class="note">
        <b class="hot">rød</b> = hurtigste i runden · ude i q1: 17–22 · ude i q2: 11–16 · – = ingen
        tid
      </p>
    </section>
  `;
}

function raceTime(row: RaceResultRow, leaderLaps: number): { text: string; dim: boolean } {
  if (row.status === "Finished" && row.time) return { text: row.time, dim: false };
  if (row.status === "Lapped" || /^\+\d+ Laps?$/i.test(row.status)) {
    const behind = Math.max(1, leaderLaps - row.laps);
    return { text: `+${behind} omg.`, dim: true };
  }
  return { text: "udgået", dim: true };
}

function raceTable(result: { laps: number; rows: RaceResultRow[] }): SafeHtml {
  const leaderLaps = result.laps;
  return html`
    <section>
      <h2>løb<span>${leaderLaps} omg.</span></h2>
      <div class="t r">
        <p class="hd">
          <span>#</span><span></span><span>kører</span><span class="n">±</span
          ><span class="n">tid</span><span class="n">p</span>
        </p>
        ${result.rows.map((row) => {
          const delta = placesDelta(row.grid, row.position);
          const time = raceTime(row, leaderLaps);
          return html`<p style="--c:${teamColor(row.teamId)}">
            <span class="m">${row.position ?? "–"}</span><span class="k"></span
            ><span
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
      <p class="note">
        ± = pladser vundet/tabt fra start · <span class="fl">●</span> hurtigste omgang
      </p>
    </section>
  `;
}

export function errorView(): SafeHtml {
  return html`
    <p class="state">
      kunne ikke hente data fra jolpica. <button type="button" data-retry>prøv igen</button>
    </p>
  `;
}
