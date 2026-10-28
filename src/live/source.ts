import type { LiveTimingQuery, LiveTimingSnapshot, LiveTimingSource } from "./types.ts";

/** Tom indtil du registrerer en kilde, for eksempel OpenF1. */
export const liveTimingSources: LiveTimingSource[] = [];

export async function getLiveSnapshot(query: LiveTimingQuery): Promise<LiveTimingSnapshot | null> {
  const source = liveTimingSources[0];
  if (!source) return null;
  return source.getSnapshot(query);
}
