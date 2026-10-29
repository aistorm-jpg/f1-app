import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const dist = join(root, "dist");
const bun = process.execPath;

function run(args: string[], stdout: "inherit" | "ignore" = "inherit"): void {
  const result = Bun.spawnSync([bun, ...args], { cwd: root, stdout, stderr: "inherit" });
  if (result.exitCode !== 0) process.exit(result.exitCode ?? 1);
}

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

await cp(join(root, "src/index.html"), join(dist, "index.html"));
await cp(join(root, "src/styles.css"), join(dist, "styles.css"));
await cp(join(root, "src/sw.js"), join(dist, "sw.js"));
await cp(join(root, "public/manifest.json"), join(dist, "manifest.json"));
await cp(join(root, "public/icons"), join(dist, "icons"), { recursive: true });

const missing = `<!doctype html><html lang="da"><head><meta charset="utf-8"><title>ikke fundet · apex</title><link rel="stylesheet" href="./styles.css"></head><body><p class="state">siden findes ikke. <a href="./">tilbage</a></p></body></html>`;
await writeFile(join(dist, "404.html"), missing);

const html = await readFile(join(dist, "index.html"), "utf8");
if (/\s(?:href|src|action)=["']\//.test(html)) {
  throw new Error(
    "index.html har en absolut rod-sti. Brug relative stier, så siden virker under /f1-app/.",
  );
}

for (const file of [
  "index.html",
  "404.html",
  "styles.css",
  "sw.js",
  "manifest.json",
  "assets/app.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
]) {
  if (!(await Bun.file(join(dist, file)).exists())) {
    console.error(`Build mangler ${file}`);
    process.exit(1);
  }
}

console.log("Byggede dist/ til GitHub Pages under /f1-app/.");
