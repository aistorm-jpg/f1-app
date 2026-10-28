/**
 * Omtrentlige teamfarver til prikken ved navnet.
 * Det er ikke logoer og ikke officielle mærker.
 */
const TEAM_COLORS: Record<string, string> = {
  mercedes: "#27F4D2",
  ferrari: "#E8002D",
  red_bull: "#3671C6",
  mclaren: "#FF8000",
  rb: "#6692FF",
  alpine: "#FF87BC",
  haas: "#B6BABD",
  audi: "#F50537",
  williams: "#64C4FF",
  aston_martin: "#229971",
  cadillac: "#C5A572",
};

const FALLBACK = "#8E8E98";
const HEX = /^#[0-9a-f]{6}$/i;

export function teamColor(teamId: string): string {
  const color = TEAM_COLORS[teamId] ?? FALLBACK;
  return HEX.test(color) ? color : FALLBACK;
}
