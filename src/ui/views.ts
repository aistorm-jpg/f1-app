import type { RacePhase } from "../logic/season.ts";
import { pointsRatio } from "../logic/season.ts";
import {
  formatPoints,
  gridLabel,
  phaseLabel,
  sessionLabel,
  statusLabel,
  winsLabel,
} from "../logic/labels.ts";
import { formatDanishDateTime } from "../logic/time.ts";
import { teamColor } from "../logic/teams.ts";
import type {
  ConstructorStanding,
  DriverStanding,
  QualifyingRow,
  ResultRow,
  Session,
  Team,
} from "../data/types.ts";
import { html, type SafeHtml } from "./html.ts";

export function teamLine(teams: readonly Team[]): SafeHtml {
  return html`<span class="team-pills"
    >${teams.map(
      (team) => html`
        <span class="pill pill-team" style="--team:${teamColor(team.id)}">
          <span class="dot" style="background:${teamColor(team.id)}" aria-hidden="true"></span>
          ${team.name}
        </span>
      `,
    )}</span
  >`;
}

export function pointsBar(points: number, leaderPoints: number, label: string): SafeHtml {
  const percent = Math.round(pointsRatio(points, leaderPoints) * 100);
  return html`
    <div
      class="bar"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow="${percent}"
      aria-label="${label}"
    >
      <span style="width:${percent}%"></span>
    </div>
  `;
}

export function phasePill(phase: RacePhase): SafeHtml {
  return html`<span class="pill pill-${phase}">${phaseLabel(phase)}</span>`;
}

export function countdownBlock(): SafeHtml {
  const units = [
    ["days", "dage"],
    ["hours", "timer"],
    ["minutes", "min"],
    ["seconds", "sek"],
  ] as const;
  return html`
    <div class="countdown" data-countdown role="timer" aria-label="Nedtælling til løbsstart">
      ${units.map(
        ([part, label]) => html`
          <div>
            <strong data-countdown-part="${part}">––</strong>
            <span data-countdown-unit="${part}">${label}</span>
          </div>
        `,
      )}
    </div>
    <p class="countdown-status" data-countdown-status hidden>Løbet er startet</p>
  `;
}

export function sessionList(sessions: readonly Session[]): SafeHtml {
  return html`
    <ul class="sessions">
      ${sessions.map(
        (session) => html`
          <li>
            <span class="pill pill-session ${session.kind === "race" ? "pill-hot" : ""}"
              >${sessionLabel(session.kind)}</span
            >
            <time datetime="${session.start}">${formatDanishDateTime(session.start)}</time>
          </li>
        `,
      )}
    </ul>
  `;
}

export function driverRow(row: DriverStanding, leaderPoints: number): SafeHtml {
  const name = `${row.driver.givenName} ${row.driver.familyName}`;
  const percent = Math.round(pointsRatio(row.points, leaderPoints) * 100);
  return html`
    <li class="standing">
      <span class="pos ${row.position === 1 ? "is-leader" : ""}">${row.position}</span>
      <div class="who">
        <p class="name">
          ${name}
          <span class="code">${row.driver.code}</span>
          ${row.driver.number ? html`<span class="number">#${row.driver.number}</span>` : ""}
        </p>
        <p class="meta">
          ${teamLine(row.teams)}
          ${row.wins > 0 ? html`<span class="pill">${winsLabel(row.wins)}</span>` : ""}
        </p>
        ${pointsBar(row.points, leaderPoints, `${name} har ${percent} procent af førerens point`)}
      </div>
      <p class="points">${formatPoints(row.points)} <small>point</small></p>
    </li>
  `;
}

export function constructorRow(row: ConstructorStanding, leaderPoints: number): SafeHtml {
  const percent = Math.round(pointsRatio(row.points, leaderPoints) * 100);
  return html`
    <li class="standing">
      <span class="pos ${row.position === 1 ? "is-leader" : ""}">${row.position}</span>
      <div class="who">
        <p class="name">${teamLine([row.team])}</p>
        <p class="meta">
          <span class="pill">${row.wins > 0 ? winsLabel(row.wins) : "Ingen sejre"}</span>
        </p>
        ${pointsBar(row.points, leaderPoints, `${row.team.name} har ${percent} procent af førerens point`)}
      </div>
      <p class="points">${formatPoints(row.points)} <small>point</small></p>
    </li>
  `;
}

function lapCell(time: string | null, rank: string | null): SafeHtml {
  return html`
    ${time ?? "–"} ${rank === "1" ? html`<span class="pill pill-hot">Hurtigste</span>` : ""}
  `;
}

export function resultTable(rows: readonly ResultRow[], caption: string): SafeHtml {
  return html`
    <div class="table-wrap">
      <table>
        <caption class="sr-only">
          ${caption}
        </caption>
        <thead>
          <tr>
            <th scope="col">Pos</th>
            <th scope="col">Kører</th>
            <th scope="col">Team</th>
            <th scope="col">Grid</th>
            <th scope="col">Omg.</th>
            <th scope="col">Tid / status</th>
            <th scope="col">Point</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(
            (row) => html`
              <tr>
                <th scope="row">${row.position}</th>
                <td>
                  ${row.driver.givenName} ${row.driver.familyName}
                  <span class="code">${row.driver.code}</span>
                </td>
                <td>${teamLine([row.team])}</td>
                <td>${gridLabel(row.grid)}</td>
                <td>${row.laps}</td>
                <td>
                  ${
                    row.time
                      ? lapCell(row.time, row.fastestLapRank)
                      : html`<span class="pill">${statusLabel(row.status)}</span>`
                  }
                </td>
                <td>${formatPoints(row.points)}</td>
              </tr>
            `,
          )}
        </tbody>
      </table>
    </div>
  `;
}

export function qualifyingTable(rows: readonly QualifyingRow[], caption: string): SafeHtml {
  const cell = (value: string | null) => value ?? "–";
  return html`
    <div class="table-wrap">
      <table>
        <caption class="sr-only">
          ${caption}
        </caption>
        <thead>
          <tr>
            <th scope="col">Pos</th>
            <th scope="col">Kører</th>
            <th scope="col">Team</th>
            <th scope="col">Q1</th>
            <th scope="col">Q2</th>
            <th scope="col">Q3</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(
            (row) => html`
              <tr>
                <th scope="row">${row.position}</th>
                <td>
                  ${row.driver.givenName} ${row.driver.familyName}
                  <span class="code">${row.driver.code}</span>
                </td>
                <td>${teamLine([row.team])}</td>
                <td>${cell(row.q1)}</td>
                <td>${cell(row.q2)}</td>
                <td>${cell(row.q3)}</td>
              </tr>
            `,
          )}
        </tbody>
      </table>
    </div>
  `;
}

export function emptyCopy(message: string): SafeHtml {
  return html`<p class="empty">${message}</p>`;
}
