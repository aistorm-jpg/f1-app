import {
  getConstructorStandings,
  getDriverStandings,
  getLatestWinner,
  getSchedule,
} from "../data/jolpica.ts";
import type { LatestWinner, Race } from "../data/types.ts";
import { formatPoints } from "../logic/labels.ts";
import { annotateRaces, pickFeatured, raceStartIso } from "../logic/season.ts";
import { formatDanishDateTime } from "../logic/time.ts";
import { html, markup, type SafeHtml } from "../ui/html.ts";
import { mountCountdown } from "../ui/countdown.ts";
import { bindRetry, sectionError } from "../ui/states.ts";
import {
  countdownBlock,
  constructorRow,
  driverRow,
  phasePill,
  sessionList,
  teamLine,
} from "../ui/views.ts";

type Settled<T> = PromiseSettledResult<T>;

function withStart(race: Race) {
  return { ...race, start: raceStartIso(race.sessions) };
}

export async function renderHome(main: HTMLElement): Promise<void> {
  const [schedule, drivers, constructors, winner] = await Promise.allSettled([
    getSchedule(),
    getDriverStandings(),
    getConstructorStandings(),
    getLatestWinner(),
  ]);

  if (schedule.status === "rejected") throw schedule.reason;

  const now = new Date();
  const annotated = annotateRaces(
    schedule.value.filter((race) => raceStartIso(race.sessions)).map(withStart),
    now,
  );
  const featured = pickFeatured(annotated);

  main.innerHTML = markup(html`
    <div class="view">
      ${
        featured
          ? hero(featured.race, featured.phase)
          : html`
              <header class="page-head">
                <div class="wrap">
                  <h1>Oversigt</h1>
                  <p class="lede">Der er ingen løb i kalenderen endnu.</p>
                </div>
              </header>
            `
      }
      <div class="wrap stack">
        <div class="split">
          ${winnerCard(winner)}
          ${
            featured
              ? html`
                  <article class="card">
                    <h2>Weekendets tider</h2>
                    <p class="meta">Dansk tid, Europe/Copenhagen.</p>
                    ${sessionList(featured.race.sessions)}
                  </article>
                `
              : ""
          }
        </div>
        ${standingsCard("Kørerstilling", "./koerer.html", drivers, (table) => {
          const leader = table.rows[0]?.points ?? 0;
          return html`
            <ol class="standings">
              ${table.rows.slice(0, 5).map((row) => driverRow(row, leader))}
            </ol>
          `;
        })}
        ${standingsCard("Konstruktørstilling", "./konstruktorer.html", constructors, (table) => {
          const leader = table.rows[0]?.points ?? 0;
          return html`
            <ol class="standings">
              ${table.rows.slice(0, 5).map((row) => constructorRow(row, leader))}
            </ol>
          `;
        })}
      </div>
    </div>
  `);

  if (featured?.phase === "next") mountCountdown(main, featured.race.start);
  if (
    drivers.status === "rejected" ||
    constructors.status === "rejected" ||
    winner.status === "rejected"
  ) {
    bindRetry(main, () => {
      void renderHome(main);
    });
  }
}

function hero(race: Race & { start: string }, phase: "next" | "live" | "season-over") {
  const shownPhase = phase === "season-over" ? "completed" : phase;
  const kicker =
    phase === "season-over"
      ? "Sæsonen er kørt"
      : phase === "live"
        ? "Løbet er i gang"
        : "Næste løb";
  return html`
    <section class="hero">
      <p class="hero-round" aria-hidden="true">${String(race.round).padStart(2, "0")}</p>
      <div class="wrap hero-inner">
        <p class="kicker">${phasePill(shownPhase)} <span>${kicker} · runde ${race.round}</span></p>
        <h1>${race.name}</h1>
        <p class="lede">${race.circuit}</p>
        <p class="meta">${race.locality} · ${race.country}</p>
        ${phase === "next" ? countdownBlock() : ""}
        ${
          phase === "live"
            ? html`<p class="live-note">
                Live tider er ikke koblet på endnu. Resultatet opdateres, når Jolpica har det.
              </p>`
            : ""
        }
        <div class="hero-actions">
          <a class="button" href="./kalender.html">Kalender</a>
          <a class="button button-ghost" href="./resultater.html?runde=${race.round}">Resultater</a>
        </div>
      </div>
    </section>
  `;
}

function winnerCard(result: Settled<LatestWinner | null>) {
  if (result.status === "rejected") {
    return sectionError("Seneste vinder kunne ikke hentes.");
  }
  const winner = result.value;
  if (!winner) {
    return html`
      <article class="card">
        <h2>Seneste vinder</h2>
        <p class="empty">Ingen løb er kørt endnu.</p>
      </article>
    `;
  }
  return html`
    <article class="card winner">
      <p class="poster-code" aria-hidden="true">${winner.driver.code}</p>
      <p class="kicker"><span class="pill pill-hot">Seneste vinder</span></p>
      <p class="winner-name">${winner.driver.familyName}</p>
      <p class="lede">${winner.driver.givenName} ${winner.driver.familyName}</p>
      <p class="meta">
        ${winner.raceName} · ${teamLine([winner.team])} · ${formatPoints(winner.points)} point
        ${winner.time ? html` · ${winner.time}` : ""}
      </p>
      <p class="meta">${winner.date ? formatDanishDateTime(winner.date) : ""}</p>
      <p><a href="./resultater.html?runde=${winner.round}">Se resultatet</a></p>
    </article>
  `;
}

function standingsCard<T extends { rows: readonly unknown[] }>(
  title: string,
  href: string,
  result: Settled<T>,
  rows: (table: T) => SafeHtml,
) {
  return html`
    <section class="block">
      <div class="section-head">
        <h2>${title}</h2>
        <a href="${href}">Se alle</a>
      </div>
      ${
        result.status === "rejected"
          ? sectionError("Stillingen kunne ikke hentes.")
          : result.value.rows.length === 0
            ? html`<p class="empty">Der er ingen stilling endnu.</p>`
            : rows(result.value)
      }
    </section>
  `;
}
