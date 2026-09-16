import { Pipe, PipeTransform } from '@angular/core';

/**
 * The reporting API returns average resolution/closure times as .NET TimeSpan
 * strings — "02:48:48", or "1.06:12:00" when the span crosses a day. Printing
 * those raw (as the previous dashboard did) forces the reader to decode a
 * format; this turns them into something scannable.
 *
 *   "02:48:48"     -> "2h 48m"
 *   "1.06:12:00"   -> "1d 6h"
 *   "00:00:42"     -> "42s"
 *   null / invalid -> "—"
 */
@Pipe({ name: 'scDuration', standalone: true })
export class DurationPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '—';

    const match = /^(?:(\d+)\.)?(\d{1,2}):(\d{2}):(\d{2})/.exec(value.trim());
    if (!match) return value;

    const days = Number(match[1] ?? 0);
    const hours = Number(match[2]);
    const minutes = Number(match[3]);
    const seconds = Number(match[4]);

    // Show at most two units — precision past that is noise for an average.
    if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }
}
