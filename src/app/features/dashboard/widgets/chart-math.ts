export interface Pt {
  x: number;
  y: number;
}

/**
 * Monotone cubic (Fritsch–Carlson) path through the points. Unlike a plain
 * Catmull-Rom spline it never overshoots between samples, so a smoothed
 * ticket count can't dip below zero or spike above the real maximum.
 * x values must be strictly increasing.
 */
export function monotonePath(p: readonly Pt[]): string {
  const n = p.length;
  if (n === 0) return '';
  if (n === 1) return `M${f(p[0].x)},${f(p[0].y)}`;

  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = p[i + 1].x - p[i].x;
    m[i] = (p[i + 1].y - p[i].y) / dx[i];
  }

  const t: number[] = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }

  let d = `M${f(p[0].x)},${f(p[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d +=
      `C${f(p[i].x + h)},${f(p[i].y + t[i] * h)}` +
      ` ${f(p[i + 1].x - h)},${f(p[i + 1].y - t[i + 1] * h)}` +
      ` ${f(p[i + 1].x)},${f(p[i + 1].y)}`;
  }
  return d;
}

/** Closes a line path down to a baseline so it can be filled. */
export function areaPath(
  line: string,
  p: readonly Pt[],
  baseline: number,
): string {
  if (p.length < 2) return '';
  return `${line}L${f(p[p.length - 1].x)},${baseline}L${f(p[0].x)},${baseline}Z`;
}

/** Evenly thins a long series to at most `max` samples, keeping both ends. */
export function downsample(values: readonly number[], max: number): number[] {
  if (values.length <= max) return [...values];
  const out: number[] = [];
  for (let i = 0; i < max; i++) {
    out.push(values[Math.round((i / (max - 1)) * (values.length - 1))]);
  }
  return out;
}

/** Axis maximum that divides evenly into four gridline steps. */
export function niceMax(value: number): { max: number; step: number } {
  const raw = Math.max(value, 1) / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const frac = raw / pow;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  const step = Math.max(1, nice * pow);
  return { max: step * 4, step };
}

function f(n: number): string {
  return Number(n.toFixed(2)).toString();
}
