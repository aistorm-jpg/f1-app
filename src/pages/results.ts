import { getQualifying, getRaceResults, getSchedule, getSprintResults } from "../data/jolpica.ts";
import type { QualifyingRow, Race, ResultRow } from "../data/types.ts";
import { html, markup, type SafeHtml } from "../ui/html.ts";
import { bindRetry, sectionError } from "../ui/states.ts";
import { emptyCopy, qualifyingTable, resultTable } from "../ui/views.ts";
import { latestStartedRound, raceStartIso } from "../logic/season.ts";

export async function renderResults(main: HTMLElement): Promise<void> {
  const races = await getSchedule();
  const requested = readRound();
  const fallback = latestStartedRound(
    races.map((race) => ({ round: race.round, start: raceStartIso(race.sessions) })),
    new Date(),
  );
  const round = requested ?? fallback ?? races[0]?.round ?? null;
  const race = races.find((item) => item.round === round) ?? null;
  const invalid = requested !== null && !race;

  let qualifying: PromiseSettledResult<QualifyingRow[]> | null = null;
  let raceRows: PromiseSettledResult<ResultRow[]> | null = null;
  let sprint: PromiseSettledResult<ResultRow[]> | null = null;
  if (race) {
    [qualifying, raceRows, sprint] = await Promise.allSettled([
      getQualifying(race.round),
      getRaceResults(race.round),
      race.sprintWeekend ? getSprintResults(race.round) : Promise.resolve([]),
    ]);
  }

  main.innerHTML = markup(html`
    <div class="view">
      <header class="page-head">
        <div class="wrap">
          <p class="kicker">Sæson ${races[0]?.season ?? ""}</p>
          <h1>Resultater</h1>
          <p class="lede">
            ${race ? `${race.name} · ${race.circuit}` : "Vælg en runde i sæsonen."}
          </p>
          ${roundSelect(races, race?.round ?? null)}
        </div>
      </header>
      <div class="wrap stack">
        ${invalid ? html`<p class="empty" role="status">Den runde findes ikke i kalenderen.</p>` : ""}
        ${race && qualifying && raceRows && sprint ? sections(race, qualifying, raceRows, sprint) : ""}
      </div>
    </div>
  `);

  main.querySelector<HTMLSelectElement>("#runde")?.addEventListener("change", (event) => {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement)) return;
    const url = new URL(location.href);
    url.searchParams.set("runde", select.value);
    history.replaceState(null, "", url);
    void renderResults(main);
  });

  if (
    qualifying?.status === "rejected" ||
    raceRows?.status === "rejected" ||
    sprint?.status === "rejected"
  ) {
    bindRetry(main, () => {
      void renderResults(main);
    });
  }
}

function readRound(): number | null {
  const raw = new URLSearchParams(location.search).get("runde");
  if (!raw || !/^\d{1,2}$/.test(raw)) return null;
  return Number(raw);
}

function roundSelect(races: readonly Race[], selected: number | null): SafeHtml {
  return html`
    <div class="toolbar">
      <label for="runde">Vælg runde</label>
      <select id="runde" name="runde">
        ${races.map(
          (race) => html`
            <option value="${race.round}" ${race.round === selected ? "selected" : ""}>
              Runde ${race.round} · ${race.name}
            </option>
          `,
        )}
      </select>
    </div>
  `;
}

function sections(
  race: Race,
  qualifying: PromiseSettledResult<QualifyingRow[]>,
  raceRows: PromiseSettledResult<ResultRow[]>,
  sprint: PromiseSettledResult<ResultRow[]>,
): SafeHtml {
  return html`
    <section class="card">
      <h2>Kvalifikation</h2>
      <p class="scroll-hint">Stryg sidelæns for alle kolonner.</p>
      ${block(qualifying, "Kvalifikationen kunne ikke hentes.", (rows) =>
        rows.length === 0
          ? emptyCopy("Kvalifikationen er ikke kørt endnu.")
          : qualifyingTable(rows, `Kvalifikation, runde ${race.round}, ${race.name}`),
      )}
    </section>
    ${
      race.sprintWeekend
        ? html`
            <section class="card">
              <h2>Sprint</h2>
              ${block(sprint, "Sprinten kunne ikke hentes.", (rows) =>
                rows.length === 0
                  ? emptyCopy("Sprinten er ikke kørt endnu.")
                  : resultTable(rows, `Sprint, runde ${race.round}, ${race.name}`),
              )}
            </section>
          `
        : ""
    }
    <section class="card">
      <h2>Løb</h2>
      <p class="scroll-hint">Stryg sidelæns for alle kolonner.</p>
      ${block(raceRows, "Løbsresultatet kunne ikke hentes.", (rows) =>
        rows.length === 0
          ? emptyCopy("Løbet er ikke kørt endnu.")
          : resultTable(rows, `Løb, runde ${race.round}, ${race.name}`),
      )}
    </section>
  `;
}

function block<T>(
  result: PromiseSettledResult<T>,
  message: string,
  render: (value: T) => SafeHtml,
): SafeHtml {
  if (result.status === "rejected") return sectionError(message);
  return render(result.value);
}
