/**
 * Small, pure presentation helpers shared by the ticket screens. Everything
 * here is derived from timestamps the API already returns (createdAt,
 * updatedAt, resolvedAt, closedAt, comment createdAt) — nothing is estimated.
 */

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/** "just now", "5m ago", "3h ago", "2d ago", "3w ago", then a calendar date. */
export function relativeTime(
  iso: string | null | undefined,
  now: number = Date.now(),
): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const diff = now - then;
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  if (diff < 60 * DAY) return `${Math.floor(diff / (7 * DAY))}w ago`;

  return new Date(then).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Elapsed time between two instants, at most two units: "2d 4h", "3h 20m",
 * "35m", "<1m". `to` may be an ISO string or epoch milliseconds.
 */
export function formatSpan(
  fromIso: string | null | undefined,
  to: string | number,
): string {
  if (!fromIso) return '';
  const from = new Date(fromIso).getTime();
  const end = typeof to === 'number' ? to : new Date(to).getTime();
  if (Number.isNaN(from) || Number.isNaN(end)) return '';

  const ms = Math.max(0, end - from);
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return '<1m';
}

/** Calendar-day label for thread dividers: Today, Yesterday, "Oct 2". */
export function dayLabel(iso: string, now: number = Date.now()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date(now)) - startOf(date)) / DAY);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';

  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** Stable key identifying a calendar day, for grouping. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export interface TextSegment {
  readonly text: string;
  /** Present only for http(s) links. */
  readonly href?: string;
}

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}]+$/;

/**
 * Splits plain text into text and link segments. Only http(s) URLs become
 * links; everything else stays text, so nothing user-written is ever treated
 * as markup.
 */
export function linkify(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    let url = match[0];
    const trailing = TRAILING_PUNCTUATION.exec(url)?.[0] ?? '';
    if (trailing) url = url.slice(0, url.length - trailing.length);
    if (!url) continue;

    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    segments.push({ text: url, href: url });
    cursor = start + url.length;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments.length ? segments : [{ text }];
}
