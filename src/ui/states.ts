import { html, markup, type SafeHtml } from "./html.ts";

export function loadingView(): SafeHtml {
  return html`
    <div class="wrap">
      <p class="state" role="status">Henter sæsondata …</p>
      <div class="skeleton" aria-hidden="true"><span></span><span></span><span></span></div>
    </div>
  `;
}

export function errorView(message: string): SafeHtml {
  return html`
    <div class="wrap view">
      <div class="card card-error" role="alert">
        <h1>Noget gik galt</h1>
        <p>${message}</p>
        <button class="button" type="button" data-retry>Prøv igen</button>
      </div>
    </div>
  `;
}

export function sectionError(message: string): SafeHtml {
  return html`
    <div class="card card-error" role="alert">
      <p>${message}</p>
      <button class="button" type="button" data-retry>Prøv igen</button>
    </div>
  `;
}

export function bindRetry(root: ParentNode, onRetry: () => void): void {
  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-retry]")) {
    button.addEventListener("click", onRetry);
  }
}

export function showError(root: HTMLElement, message: string, onRetry: () => void): void {
  root.innerHTML = markup(errorView(message));
  root.setAttribute("aria-busy", "false");
  bindRetry(root, onRetry);
}
