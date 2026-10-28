import { getSchedule } from "../data/jolpica.ts";
import { html, markup } from "../ui/html.ts";
import { mountCountdown } from "../ui/countdown.ts";
import { annotateRaces, raceStartIso, type RacePhase } from "../logic/season.ts";
import { countdownBlock, emptyCopy, phasePill, sessionList } from "../ui/views.ts";

export async function renderCalendar(main: HTMLElement): Promise<void> {
  const races = await getSchedule();
  const now = new Date();
  const annotated = annotateRaces(
    races
      .filter((race) => raceStartIso(race.sessions))
      .map((race) => ({
        ...race,
        start: raceStartIso(race.sessions),
      })),
    now,
  );
  const next = annotated.find((race) => race.phase === "next");

  main.innerHTML = markup(html`
    <div class="view">
      <header class="page-head">
        <div class="wrap">
          <p class="kicker">Sæson ${races[0]?.season ?? ""}</p>
          <h1>Løbskalender</h1>
          <p class="lede">
            Alle tider er omregnet til dansk tid (Europe/Copenhagen) og følger sommertid. Et løb
            står som i gang i tre timer efter start.
          </p>
        </div>
      </header>
      <div class="wrap stack">
        ${
          annotated.length === 0
            ? emptyCopy("Kalenderen er tom.")
            : html` <div class="race-list">${annotated.map((race) => raceCard(race))}</div> `
        }
      </div>
    </div>
  `);

  if (next) mountCountdown(main, next.start);
}

function raceCard(race: {
  round: number;
  name: string;
  circuit: string;
  locality: string;
  country: string;
  sprintWeekend: boolean;
  sessions: Parameters<typeof sessionList>[0];
  phase: RacePhase;
}): ReturnType<typeof html> {
  return html`
    <article class="race card is-${race.phase}">
      <header class="race-top">
        <p class="round">Runde ${race.round}</p>
        <div class="pills">
          ${phasePill(race.phase)}
          ${race.sprintWeekend ? html`<span class="pill">Sprint</span>` : ""}
        </div>
      </header>
      <h2>${race.name}</h2>
      <p class="lede">${race.circuit}</p>
      <p class="meta">${race.locality} · ${race.country}</p>
      ${race.phase === "next" ? countdownBlock() : ""} ${sessionList(race.sessions)}
    </article>
  `;
}
