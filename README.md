# Apex

Personlig oversigt over Formel 1-sæsonen 2026. Siden er på dansk, tiderne er danske, og den er lavet til at ligge på hjemmeskærmen.

Apex bruger ikke officielle logoer eller det officielle F1-ordmærke. Det røde mærke er vores eget.

## Det skal du bruge

[Bun](https://bun.sh) 1.4 eller nyere. Bun er både runtime, pakkehåndtering og bundler.

## Kør den lokalt

```bash
bun install
bun run dev
```

Åbn [http://localhost:3000/f1-app/](http://localhost:3000/f1-app/). Roden sender dig videre dertil, så stien ligner GitHub Pages.

Andre kommandoer:

| Kommando          | Hvad den gør                                       |
| ----------------- | -------------------------------------------------- |
| `bun test`        | Tester tid, stilling, mapping og cache             |
| `bun run lint`    | Kører oxlint                                       |
| `bun run format`  | Formaterer koden med oxfmt                         |
| `bun run build`   | Bygger det statiske site i `dist/` med `bun build` |
| `bun run preview` | Viser `dist/` uden at bygge igen                   |

`bun run dev` bygger først og bygger igen, når du gemmer en fil.

## Sådan er koden skruet sammen

Der er ingen React, ingen Tailwind og ingen Next.js. Det er HTML, CSS og TypeScript.

```text
src/shell.html     fælles ramme: menu, footer, PWA-tags
src/styles.css     udseendet
src/main.ts        finder siden og tegner den
src/pages/         oversigt, stillinger, kalender, resultater
src/ui/            små HTML-bidder, nedtælling, fejl og loading
src/data/          kald til Jolpica, omskrivning af JSON, localStorage
src/logic/         dansk tid, næste løb, point-søjler, tekster
src/live/          plads til live timing senere. Bruges ikke endnu
src/sw.js          service worker, så siden kan installeres
public/            manifest og ikoner
scripts/build.ts   bun build, og kopierer HTML, CSS, fonte og ikoner til dist/
tests/             bun test
```

Hver side er en rigtig HTML-fil (`index.html`, `koerer.html`, `konstruktorer.html`, `kalender.html`, `resultater.html`). De deler samme JavaScript. Links er relative (`./kalender.html`), så siden virker både lokalt og under `/f1-app/` på GitHub Pages.

`src/ui/html.ts` er en lille skabelon. Tekst fra API'en bliver escaped, så et navn ikke kan blive til HTML.

## Data

Tallene kommer fra [Jolpica](https://api.jolpi.ca/ergast/f1/), som er arvtageren til Ergast. Der skal ingen nøgle til, og browseren henter selv. Sæsonen står i `src/config.ts` (`SEASON`). Lige nu er den `2026`.

Svarene gemmes i `localStorage`:

- kalenderen i 6 timer
- stillinger og resultater i 5 minutter

Om et løb er kørt, i gang eller det næste, regnes ud fra uret på din telefon og løbets starttid. Derfor må kalenderen godt ligge i cachen længe. Hvis nettet fejler, vises den gamle kopi. Er der ingen kopi, kommer der en fejl og en knap til at prøve igen.

## Tider

Alle tidspunkter vises i `Europe/Copenhagen`. Sommertid ligger i `Intl`, så vi lægger ikke selv en time til. Testene låser skiftene i 2026, blandt andet natten den 25. oktober, hvor uret stilles tilbage.

Et løb står som **i gang** i tre timer efter start. Derefter er det **kørt**. Det næste løb får en nedtælling.

## Live timing senere

Live tider under kvalifikation og løb er ikke bygget. `src/live/types.ts` beskriver et `LiveTimingSource`, og `src/live/source.ts` har en tom liste. Når du vil koble en kilde på, implementerer du interfacet og lægger kilden i listen. Siderne skal ikke skrives om for at det kan lade sig gøre.

Et godt sted at starte er [OpenF1](https://openf1.org). Det åbne API på `https://api.openf1.org/v1/` har position, mellemrum og omgangstider fra tidtagningen, uden nøgle til de offentlige endpoints. Jolpica er stadig den rigtige kilde til stilling, kalender og resultater, men den er ikke live under løbet.

## PWA

`manifest.json` og service workeren gør siden installerbar. På iPhone: åbn siden i Safari, tryk Del, og vælg **Føj til hjemmeskærm**. Ikonet er det røde chevron. Service workeren prøver nettet først og falder tilbage til den gemte kopi, hvis du er offline. Den registreres ikke på `localhost`, så den ikke generer, mens du udvikler.

## Læg den på GitHub Pages

Workflowet `.github/workflows/pages.yml` kører på hvert push til `main`. Det installerer med Bun, kører oxlint og `bun test`, bygger, og udgiver `dist/` med `actions/upload-pages-artifact` og `actions/deploy-pages`.

### Engangstrin

Første gang skal GitHub vide, at siderne kommer fra Actions, ikke fra en branch:

1. Åbn repoet på GitHub.
2. Gå til **Settings → Pages**.
3. Under **Build and deployment** sæt **Source** til **GitHub Actions**.

Når det er gemt, og workflowet er grønt, ligger siden på:

[https://aistorm-jpg.github.io/f1-app/](https://aistorm-jpg.github.io/f1-app/)

Et pull request kører lint, test og build, men udgiver ikke. **Når du merger til `main`, starter udgivelsen.**

## Fonte

Oswald og Outfit ligger i `assets/fonts/` under SIL Open Font License. Licensen står ved siden af filerne.
