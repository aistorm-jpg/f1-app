import { renderCalendar } from "./pages/calendar.ts";
import { renderHome } from "./pages/home.ts";
import { renderResults } from "./pages/results.ts";
import { renderConstructors, renderDrivers } from "./pages/standings.ts";
import { markup } from "./ui/html.ts";
import { bindRetry, errorView, loadingView } from "./ui/states.ts";

const pages = {
  home: renderHome,
  drivers: renderDrivers,
  constructors: renderConstructors,
  calendar: renderCalendar,
  results: renderResults,
} as const;

type PageId = keyof typeof pages;

function registerServiceWorker(): void {
  const host = location.hostname;
  const local = host === "localhost" || host === "127.0.0.1";
  if (local || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Siden virker uden service worker. Den skal bruge den for at kunne installeres.
    });
  });
}

async function run(render: (main: HTMLElement) => Promise<void>, main: HTMLElement): Promise<void> {
  main.setAttribute("aria-busy", "true");
  main.innerHTML = markup(loadingView());
  try {
    await render(main);
    main.setAttribute("aria-busy", "false");
  } catch (error) {
    console.error(error);
    main.innerHTML = markup(
      errorView("Vi kunne ikke hente data fra Jolpica lige nu. Tjek forbindelsen og prøv igen."),
    );
    main.setAttribute("aria-busy", "false");
    bindRetry(main, () => {
      void run(render, main);
    });
  }
}

function boot(): void {
  const page = document.body.dataset.page;
  const main = document.querySelector<HTMLElement>("#indhold");
  if (!main || !page || !(page in pages)) return;
  registerServiceWorker();
  void run(pages[page as PageId], main);
}

boot();
