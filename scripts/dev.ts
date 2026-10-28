import { watch } from "node:fs";
import { join } from "node:path";
import { startServer } from "./serve.ts";

const root = join(import.meta.dir, "..");

function build(): boolean {
  const result = Bun.spawnSync([process.execPath, "run", "scripts/build.ts"], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  });
  return result.exitCode === 0;
}

if (!build()) {
  console.error("Første build fejlede.");
  process.exit(1);
}

startServer();

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let queued = false;

async function rebuild(): Promise<void> {
  if (running) {
    queued = true;
    return;
  }
  running = true;
  do {
    queued = false;
    build();
  } while (queued);
  running = false;
}

for (const folder of ["src", "public", "assets"]) {
  watch(join(root, folder), { recursive: true }, () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void rebuild();
    }, 80);
  });
}
