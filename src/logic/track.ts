export interface TrackPoint {
  x: number;
  y: number;
}

export interface TrackDrawing {
  viewBox: string;
  outline: string;
  startLine: string;
  clockwise: boolean;
}

const STRAIGHT_TOLERANCE = 0.22;

function bearing(a: TrackPoint, b: TrackPoint): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function angleDelta(a: number, b: number): number {
  let delta = a - b;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function distance(a: TrackPoint, b: TrackPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function toLocal(coordinates: readonly [number, number][]): TrackPoint[] {
  const lat0 = coordinates.reduce((sum, pair) => sum + pair[1], 0) / coordinates.length;
  const lon0 = coordinates.reduce((sum, pair) => sum + pair[0], 0) / coordinates.length;
  const metersPerLon = 111_320 * Math.cos((lat0 * Math.PI) / 180);
  return coordinates.map(([lon, lat]) => ({
    x: (lon - lon0) * metersPerLon,
    y: (lat - lat0) * 110_540,
  }));
}

function openRing(points: TrackPoint[]): TrackPoint[] {
  if (points.length < 2) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (first && last && distance(first, last) < 2) return points.slice(0, -1);
  return points;
}

/** Hvor langt start/mål-langsiden går, før banen drejer. */
function straightEnd(points: TrackPoint[], tolerance: number): number {
  const first = points[0];
  const second = points[1];
  if (!first || !second) return 0;
  const base = bearing(first, second);
  let end = 1;
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    if (!current || !next) break;
    if (Math.abs(angleDelta(bearing(current, next), base)) > tolerance) break;
    end = index + 1;
  }
  return end;
}

function longestStraightAngle(points: TrackPoint[]): number {
  let bestLength = 0;
  let bestAngle = 0;
  for (let start = 0; start < points.length - 1; start += 1) {
    const origin = points[start];
    const next = points[start + 1];
    if (!origin || !next) continue;
    const base = bearing(origin, next);
    let length = distance(origin, next);
    let end = start + 1;
    for (let index = start + 1; index < points.length - 1; index += 1) {
      const current = points[index];
      const following = points[index + 1];
      if (!current || !following) break;
      if (Math.abs(angleDelta(bearing(current, following), base)) > STRAIGHT_TOLERANCE) break;
      length += distance(current, following);
      end = index + 1;
    }
    if (length > bestLength) {
      const last = points[end];
      if (!last) continue;
      bestLength = length;
      bestAngle = bearing(origin, last);
    }
  }
  return bestAngle;
}

function rotationForStart(points: TrackPoint[]): number {
  const end = straightEnd(points, STRAIGHT_TOLERANCE);
  const looseEnd = end < 2 ? straightEnd(points, 0.45) : end;
  const start = points[0];
  const finish = points[looseEnd];
  if (!start || !finish || distance(start, finish) < 150) return -longestStraightAngle(points);
  return -bearing(start, finish);
}

function rotate(point: TrackPoint, radians: number): TrackPoint {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: point.x * cos - point.y * sin,
    y: -(point.x * sin + point.y * cos),
  };
}

function shoelace(points: TrackPoint[]): number {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (!current || !next) continue;
    sum += current.x * next.y - next.x * current.y;
  }
  return sum;
}

/**
 * Banekort til SVG. Start/mål-langsiden lægges vandret, køreretningen
 * peger mod højre, og y vender nedad som i SVG.
 */
export function drawTrack(coordinates: readonly [number, number][]): TrackDrawing | null {
  if (coordinates.length < 4) return null;
  const local = openRing(toLocal(coordinates));
  if (local.length < 4) return null;
  const turned = local.map((point) => rotate(point, rotationForStart(local)));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of turned) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  const span = Math.max(maxX - minX, maxY - minY, 1);
  const pad = span * 0.08;
  const placed = turned.map((point) => ({ x: point.x - minX + pad, y: point.y - minY + pad }));
  const width = maxX - minX + pad * 2;
  const height = maxY - minY + pad * 2;
  const outline = `M${placed.map((point) => `${point.x.toFixed(0)},${point.y.toFixed(0)}`).join(" L")} Z`;
  const start = placed[0];
  if (!start) return null;
  const mark = Math.max(18, span * 0.045);
  return {
    viewBox: `0 0 ${width.toFixed(0)} ${height.toFixed(0)}`,
    outline,
    startLine: `M${start.x.toFixed(0)},${(start.y - mark).toFixed(0)} L${start.x.toFixed(0)},${(start.y + mark).toFixed(0)}`,
    clockwise: shoelace(placed) > 0,
  };
}
