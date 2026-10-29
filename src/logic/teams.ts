const TEAM_COLORS: Record<string, string> = {
  mercedes: "#00b3a6",
  ferrari: "#e10600",
  red_bull: "#4a7fd6",
  mclaren: "#ff8000",
  rb: "#7a9bff",
  alpine: "#ff87bc",
  haas: "#9a9ea3",
  audi: "#52b052",
  williams: "#64c4ff",
  aston_martin: "#2aa37f",
  cadillac: "#e8e6e3",
};

const FALLBACK = "#888888";

export function teamColor(teamId: string): string {
  const color = TEAM_COLORS[teamId] ?? FALLBACK;
  return /^#[0-9a-f]{6}$/i.test(color) ? color : FALLBACK;
}
