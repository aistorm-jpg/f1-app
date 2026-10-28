import { join } from "node:path";
import { startServer } from "./serve.ts";

const dist = join(import.meta.dir, "..", "dist", "index.html");
if (!(await Bun.file(dist).exists())) {
  console.error("Der er ingen dist/ endnu. Kør `bun run build` først.");
  process.exit(1);
}

startServer();
