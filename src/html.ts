const SAFE: unique symbol = Symbol("safeHtml");

export type SafeHtml = { readonly [SAFE]: true; readonly value: string };

function isSafe(value: unknown): value is SafeHtml {
  return typeof value === "object" && value !== null && SAFE in value;
}

function mark(value: string): SafeHtml {
  return { [SAFE]: true, value };
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stringify(value: unknown): string {
  if (value == null || value === false) return "";
  if (Array.isArray(value)) return value.map(stringify).join("");
  if (isSafe(value)) return value.value;
  return escapeHtml(String(value));
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let out = strings[0] ?? "";
  for (let index = 0; index < values.length; index += 1) {
    out += stringify(values[index]) + (strings[index + 1] ?? "");
  }
  return mark(out);
}

export function markup(value: SafeHtml): string {
  return value.value;
}
