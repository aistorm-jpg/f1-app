import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SEASON } from "../src/config.ts";

const root = join(import.meta.dir, "..");
const dist = join(root, "dist");
const bun = process.execPath;

const pages = [
  {
    file: "index.html",
    page: "home",
    title: "Oversigt",
    description: "Næste løb, nedtælling, toppen af stillingen og seneste vinder.",
  },
  {
    file: "koerer.html",
    page: "drivers",
    title: "Kørerstilling",
    description: "Kørernes point, placering og team.",
  },
  {
    file: "konstruktorer.html",
    page: "constructors",
    title: "Konstruktørstilling",
    description: "Konstruktørernes point i sæsonen.",
  },
  {
    file: "kalender.html",
    page: "calendar",
    title: "Løbskalender",
    description: "Alle løb med sessionstider i dansk tid.",
  },
  {
    file: "resultater.html",
    page: "results",
    title: "Resultater",
    description: "Kvalifikation og løbsresultat for hver runde.",
  },
] as const;

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? "");
}

function run(args: string[], stdout: "inherit" | "ignore" = "inherit"): void {
  const result = Bun.spawnSync([bun, ...args], {
    cwd: root,
    stdout,
    stderr: "inherit",
  });
  if (result.exitCode !== 0) process.exit(result.exitCode ?? 1);
}

const shell = await readFile(join(root, "src/shell.html"), "utf8");
await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, "assets"), { recursive: true });

run(["build", join(root, "src/main.ts"), "--check", "--target=browser"], "ignore");
run([
  "build",
  join(root, "src/main.ts"),
  "--outdir",
  join(dist, "assets"),
  "--target",
  "browser",
  "--minify",
  "--entry-naming",
  "app.js",
]);

await cp(join(root, "src/styles.css"), join(dist, "styles.css"));
await cp(join(root, "src/sw.js"), join(dist, "sw.js"));
await mkdir(join(dist, "fonts"), { recursive: true });
await cp(join(root, "assets/fonts/oswald.woff2"), join(dist, "fonts/oswald.woff2"));
await cp(join(root, "assets/fonts/outfit.woff2"), join(dist, "fonts/outfit.woff2"));
await cp(join(root, "public/manifest.json"), join(dist, "manifest.json"));
await cp(join(root, "public/icons"), join(dist, "icons"), { recursive: true });

const loading = `
    <div class="wrap">
      <p class="state" role="status">Henter sæsondata …</p>
      <div class="skeleton" aria-hidden="true"><span></span><span></span><span></span></div>
      <noscript><p class="state">Apex skal bruge JavaScript for at hente sæsondata.</p></noscript>
    </div>`;

const script = `    <script type="module" src="./assets/app.js"></script>`;

function renderPage(options: {
  file: string;
  page: string;
  title: string;
  description: string;
  main: string;
  script: string;
  busy: string;
}): string {
  const current = (id: string) => (options.page === id ? 'aria-current="page"' : "");
  const html = fill(shell, {
    title: options.title,
    description: options.description,
    page: options.page,
    season: SEASON,
    busy: options.busy,
    homeCurrent: current("home"),
    driversCurrent: current("drivers"),
    constructorsCurrent: current("constructors"),
    calendarCurrent: current("calendar"),
    resultsCurrent: current("results"),
    main: options.main,
    script: options.script,
  });
  if (/\s(?:href|src|action)=["']\//.test(html)) {
    throw new Error(
      `${options.file} har en absolut rod-sti. Brug relative stier, så siden virker under /f1-app/.`,
    );
  }
  if (html.includes("{{")) {
    throw new Error(`${options.file} har et ukendt skabelonfelt.`);
  }
  return html;
}

for (const page of pages) {
  const html = renderPage({ ...page, main: loading, script, busy: "true" });
  await writeFile(join(dist, page.file), html);
}

const notFound = renderPage({
  file: "404.html",
  page: "missing",
  title: "Siden findes ikke",
  description: "Siden findes ikke i Apex.",
  busy: "false",
  script: "",
  main: `
    <header class="page-head">
      <div class="wrap">
        <h1>Siden findes ikke</h1>
        <p class="lede">Det link peger ikke på en side i Apex.</p>
        <p class="hero-actions"><a class="button" href="./">Til forsiden</a></p>
      </div>
    </header>`,
});
await writeFile(join(dist, "404.html"), notFound);

const required = [
  "index.html",
  "koerer.html",
  "konstruktorer.html",
  "kalender.html",
  "resultater.html",
  "404.html",
  "styles.css",
  "sw.js",
  "manifest.json",
  "assets/app.js",
  "fonts/oswald.woff2",
  "fonts/outfit.woff2",
  "icons/favicon-32.png",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
];

for (const file of required) {
  if (!(await Bun.file(join(dist, file)).exists())) {
    console.error(`Build mangler ${file}`);
    process.exit(1);
  }
}

console.log("Byggede dist/ til GitHub Pages under /f1-app/.");
