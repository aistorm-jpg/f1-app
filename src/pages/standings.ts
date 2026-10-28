import { getConstructorStandings, getDriverStandings } from "../data/jolpica.ts";
import { html, markup } from "../ui/html.ts";
import { constructorRow, driverRow, emptyCopy } from "../ui/views.ts";

export async function renderDrivers(main: HTMLElement): Promise<void> {
  const table = await getDriverStandings();
  const leader = table.rows[0]?.points ?? 0;
  const roundText = table.round > 0 ? `Efter runde ${table.round}. ` : "";
  main.innerHTML = markup(html`
    <div class="view">
      <header class="page-head">
        <div class="wrap">
          <p class="kicker">Sæson ${table.season || ""}</p>
          <h1>Kørerstilling</h1>
          <p class="lede">${roundText}Søjlen viser hvor tæt feltet er på føringen.</p>
        </div>
      </header>
      <div class="wrap stack">
        ${
          table.rows.length === 0
            ? emptyCopy("Der er ingen kørerstilling endnu.")
            : html`
                <ol class="standings">
                  ${table.rows.map((row) => driverRow(row, leader))}
                </ol>
              `
        }
      </div>
    </div>
  `);
}

export async function renderConstructors(main: HTMLElement): Promise<void> {
  const table = await getConstructorStandings();
  const leader = table.rows[0]?.points ?? 0;
  const roundText = table.round > 0 ? `Efter runde ${table.round}. ` : "";
  main.innerHTML = markup(html`
    <div class="view">
      <header class="page-head">
        <div class="wrap">
          <p class="kicker">Sæson ${table.season || ""}</p>
          <h1>Konstruktørstilling</h1>
          <p class="lede">${roundText}Point til konstruktørerne, målt mod føringen.</p>
        </div>
      </header>
      <div class="wrap stack">
        ${
          table.rows.length === 0
            ? emptyCopy("Der er ingen konstruktørstilling endnu.")
            : html`
                <ol class="standings">
                  ${table.rows.map((row) => constructorRow(row, leader))}
                </ol>
              `
        }
      </div>
    </div>
  `);
}
