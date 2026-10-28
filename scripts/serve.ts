import { extname, join, sep } from "node:path";

const root = join(import.meta.dir, "..");
const dist = join(root, "dist");
const BASE = "/f1-app";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function fileFor(pathname: string): string | null {
  let path = pathname;
  if (path === BASE || path === `${BASE}/`) path = "/index.html";
  else if (path.startsWith(`${BASE}/`)) path = path.slice(BASE.length);
  if (path === "/") path = "/index.html";
  if (path.includes("\0") || path.split("/").includes("..")) return null;
  const full = join(dist, path.replace(/^\/+/, ""));
  const prefix = dist.endsWith(sep) ? dist : `${dist}${sep}`;
  if (full !== dist && !full.startsWith(prefix)) return null;
  return full;
}

export function startServer(port = Number(process.env.PORT ?? 3000)): void {
  Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === "/") return Response.redirect(`${BASE}/`, 302);
      const full = fileFor(url.pathname);
      if (!full) return text("Ikke fundet", 404);
      const file = Bun.file(full);
      if (!(await file.exists())) return missing();
      const type = TYPES[extname(full)] ?? "application/octet-stream";
      return new Response(file, {
        headers: { "Content-Type": type, "Cache-Control": "no-cache" },
      });
    },
  });
  console.log(`Apex kører på http://localhost:${port}/f1-app/`);
}

function text(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

async function missing(): Promise<Response> {
  const file = Bun.file(join(dist, "404.html"));
  if (await file.exists()) {
    return new Response(file, {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" },
    });
  }
  return text("Ikke fundet", 404);
}
