/**
 * Live timing er ikke bygget.
 * Når du vil koble en kilde på, så implementer LiveTimingSource
 * og læg den i listen i source.ts. Siderne kender ikke kilden endnu,
 * så kalender og resultater behøver ikke at blive skrevet om.
 */
export type LiveSessionKind = "practice" | "qualifying" | "sprint" | "race";

export interface LiveTimingEntry {
  position: number;
  driverCode: string;
  gapToLeader: string | null;
  interval: string | null;
  lastLap: string | null;
  status: "on-track" | "in-pit" | "out" | "finished" | "stopped";
}

export interface LiveTimingSnapshot {
  sourceId: string;
  session: LiveSessionKind;
  updatedAt: string;
  entries: LiveTimingEntry[];
}

export interface LiveTimingQuery {
  season: string;
  round: number;
  session: LiveSessionKind;
}

export interface LiveTimingSource {
  id: string;
  label: string;
  getSnapshot(query: LiveTimingQuery): Promise<LiveTimingSnapshot | null>;
}
