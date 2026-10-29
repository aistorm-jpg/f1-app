import { loadBoard } from "./data/jolpica.ts";
import { markup } from "./html.ts";
import { countdownParts, pad2 } from "./logic/board.ts";
import { errorView, renderBoard } from "./render.ts";

const root = document.querySelector<HTMLElement>("#app");

function tick(scope: ParentNode, targetIso: string): void {
  const parts = countdownParts(targetIso, new Date());
  const days = scope.querySelector<HTMLElement>("[data-cd='days']");
  const hours = scope.querySelector<HTMLElement>("[data-cd='hours']");
  const minutes = scope.querySelector<HTMLElement>("[data-cd='minutes']");
  if (days) days.textContent = String(parts.days);
  if (hours) hours.textContent = pad2(parts.hours);
  if (minutes) minutes.textContent = pad2(parts.minutes);
}

function mountCountdown(scope: ParentNode): void {
  const node = scope.querySelector<HTMLElement>("[data-countdown]");
  const target = node?.dataset.at;
  if (!target) return;
  tick(scope, target);
  window.setInterval(() => tick(scope, target), 1000);
}

function registerServiceWorker(): void {
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => undefined);
  });
}

async function boot(): Promise<void> {
  if (!root) return;
  root.setAttribute("aria-busy", "true");
  try {
    const board = await loadBoard();
    root.innerHTML = markup(renderBoard(board, new Date()));
    root.setAttribute("aria-busy", "false");
    mountCountdown(root);
  } catch (error) {
    console.error(error);
    root.innerHTML = markup(errorView());
    root.setAttribute("aria-busy", "false");
    root.querySelector("[data-retry]")?.addEventListener("click", () => {
      root.innerHTML = `<p class="state">henter sæsondata …</p>`;
      void boot();
    });
  }
}

registerServiceWorker();
void boot();
