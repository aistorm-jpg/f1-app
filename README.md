# apex. pit wall

En enkelt, mørk side med sæsonen 2026. Nedtælling til næste grand prix, tider i dansk tid, kører- og konstruktørstilling, og seneste kvalifikation og løb.

Sproget er dansk, til du vælger engelsk. Skiftet `da / en` ligger i statuslinjen. Valget gemmes i browseren, og `?lang=en` kan deles. Datoer og ugedage følger sproget. Klokken er stadig dansk tid, `Europe/Copenhagen`, og hedder "danish time" på engelsk.

Teksten er systemets monospace. Den eneste høje farve er den røde nedtælling, `#E10600`. Der er ingen officielle logoer.

## Det skal du bruge

[Bun](https://bun.sh) 1.4 eller nyere.

## Kør den lokalt

```bash
bun install
bun run dev
```

Åbn [http://localhost:3000/f1-app/](http://localhost:3000/f1-app/). Roden sender dig videre, så stien er den samme som på GitHub Pages.

| Kommando          | Hvad den gør                                 |
| ----------------- | -------------------------------------------- |
| `bun test`        | Tester tid, søjler, runde, banekort og cache |
| `bun run lint`    | oxlint                                       |
| `bun run format`  | oxfmt                                        |
| `bun run build`   | Statisk site i `dist/` via `bun build`       |
| `bun run preview` | Viser `dist/` under `/f1-app/`               |

## Sådan er koden skruet sammen

Én side. Ingen router.

```text
src/index.html     skallen. JavaScript fylder den
src/styles.css     layoutet fra pit wall-mockupen
src/main.ts        henter data, tegner siden, tæller ned
src/render.ts      HTML for hero, stillinger og resultat
src/data/          Jolpica, localStorage og banernes koordinater
src/logic/         dansk tid, søjler, og SVG af banen
src/sw.js          service worker, så siden kan installeres
scripts/build.ts   bun build og kopiering til dist/
```

Links og filer er relative, så siden virker under `/f1-app/`.

## Data

Tallene kommer fra [Jolpica](https://api.jolpi.ca/ergast/f1/) i browseren. Sæsonen står i `src/config.ts`.

Kalenderen caches i 6 timer. Stilling og resultater caches i 5 minutter. Fejler nettet, vises den gamle kopi. Ellers er der en kort fejl og en knap til at prøve igen.

Nedtællingen går til næste løbsstart. Den viser dage, timer, minutter og sekunder, og sekundtallet skifter hvert sekund. Mens fanen er skjult, står uret stille for at spare batteri, og det stiller sig igen, når du kommer tilbage. `prefers-reduced-motion` slår blink og puls fra. Selve tallene skifter stadig.

Over kvalifikation og løb kan du vælge en tidligere runde, for eksempel `r18 · united states gp`. Valget ligger i adressen som `?runde=12`, så linket kan deles. Under en live-session er live-tavlen standard, indtil du vælger en runde.

## Når der køres

Den røde prik pulserer kun, mens en session er i gang (fra ti minutter før start og et stykke tid efter, alt efter om det er træning, kval eller løb).

OpenF1 kan levere tider cirka hvert 8. sekund, men kun gratis når sessionen ikke længere regnes som live hos dem. Selve live-strømmen koster penge, og siden har ingen nøgle. Derfor tjekkes Jolpica cirka hvert 30. sekund i det vindue. De tal kan halte. Når sessionen er slut, vises Jolpicas officielle resultat igen.

`?demo=live` viser en optaget tavle fra USA 2026, så man kan se live-layoutet uden at der køres. Pointene i demoen er lagt oven i stillingen og er ikke officielle.

Alle tider er `Europe/Copenhagen`. Sommertid ligger i `Intl`.

Banekortet tegnes fra rigtige koordinater (Tomislav Bacinger, [f1-circuits](https://github.com/bacinger/f1-circuits), MIT). Start/mål-langsiden lægges vandret, den røde streg er start, og teksten siger om banen køres med eller mod uret. Licensen ligger i `src/data/CIRCUITS-LICENSE.txt`.

## PWA

`manifest.json` og service workeren gør siden installerbar. På iPhone: Safari, Del, **Føj til hjemmeskærm**. Service workeren registreres ikke på `localhost`.

En ny udgivelse når også en side, der er gemt på hjemmeskærmen. Workeren henter sig selv på ny, smider den gamle cache ud og genindlæser siden én gang. Den gemmer ikke sin egen fil, så den ikke kan sidde fast på en gammel udgave.

## GitHub Pages

`.github/workflows/pages.yml` kører på push til `main`: Bun install, oxlint, `bun test`, build, og udgivelse med `actions/upload-pages-artifact` og `actions/deploy-pages`.

Hvis Pages ikke allerede peger på Actions: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Siden ligger på [https://aistorm-jpg.github.io/f1-app/](https://aistorm-jpg.github.io/f1-app/). Et pull request tester, men udgiver ikke. Udgivelsen starter, når ændringen er på `main`.
