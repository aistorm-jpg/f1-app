import { countdownParts, pad2 } from "../logic/season.ts";

const UNITS = [
  { part: "days", one: "dag", many: "dage" },
  { part: "hours", one: "time", many: "timer" },
  { part: "minutes", one: "min", many: "min" },
  { part: "seconds", one: "sek", many: "sek" },
] as const;

let timer = 0;

export function mountCountdown(root: ParentNode, targetIso: string): void {
  window.clearInterval(timer);

  const tick = () => {
    const nodes = root.querySelectorAll<HTMLElement>("[data-countdown-part]");
    if (nodes.length === 0) {
      window.clearInterval(timer);
      return;
    }

    const parts = countdownParts(targetIso, new Date());
    const grid = root.querySelector<HTMLElement>("[data-countdown]");
    const status = root.querySelector<HTMLElement>("[data-countdown-status]");
    if (parts.elapsed) {
      grid?.setAttribute("hidden", "");
      status?.removeAttribute("hidden");
      window.clearInterval(timer);
      return;
    }

    for (const unit of UNITS) {
      const value = parts[unit.part];
      const valueNode = root.querySelector<HTMLElement>(`[data-countdown-part="${unit.part}"]`);
      const labelNode = root.querySelector<HTMLElement>(`[data-countdown-unit="${unit.part}"]`);
      if (valueNode) valueNode.textContent = pad2(value);
      if (labelNode) labelNode.textContent = value === 1 ? unit.one : unit.many;
    }
  };

  tick();
  timer = window.setInterval(tick, 1000);
}
