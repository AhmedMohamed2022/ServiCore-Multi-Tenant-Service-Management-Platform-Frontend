import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { Pt, areaPath, monotonePath, niceMax } from '../chart-math';
import { TicketTimeSeriesPointData } from '../../models/reporting.model';

type SeriesKey = 'raised' | 'resolved' | 'closed';

interface Bucket {
  /** Short axis label. */
  label: string;
  /** Full label for the tooltip (a range when several days are merged). */
  title: string;
  raised: number;
  resolved: number;
  closed: number;
}

interface SeriesMeta {
  key: SeriesKey;
  label: string;
}

/** Keeps the plot legible: longer ranges are merged into equal day-buckets. */
const MAX_POINTS = 45;

let nextId = 0;

/**
 * Ticket flow over time. Built from SVG paths plus HTML overlays instead of a
 * chart library so that:
 *  - every colour is a design token (no hex in TypeScript);
 *  - text stays a fixed size at any width (only the geometry stretches);
 *  - the plot can be read by pointer, touch and keyboard.
 *
 * Data comes straight from GET /reports/tickets/time-series.
 */
@Component({
  selector: 'app-trend-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trend-chart.component.html',
  styleUrls: ['./trend-chart.component.css'],
})
export class TrendChartComponent {
  readonly points = input.required<readonly TicketTimeSeriesPointData[]>();

  protected readonly gradId = `tc-grad-${nextId++}`;

  protected readonly seriesMeta: readonly SeriesMeta[] = [
    { key: 'raised', label: 'Raised' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Closed' },
  ];

  protected readonly visible = signal<Record<SeriesKey, boolean>>({
    raised: true,
    resolved: true,
    closed: false,
  });

  protected readonly active = signal<number | null>(null);

  protected readonly buckets = computed<Bucket[]>(() => {
    const sorted = [...this.points()].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    if (sorted.length === 0) return [];

    const size = Math.ceil(sorted.length / MAX_POINTS);
    const short = (iso: string) =>
      new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    const long = (iso: string) =>
      new Date(iso).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

    const out: Bucket[] = [];
    for (let i = 0; i < sorted.length; i += size) {
      const group = sorted.slice(i, i + size);
      const first = group[0];
      const last = group[group.length - 1];
      out.push({
        label: short(first.date),
        title:
          group.length === 1
            ? long(first.date)
            : `${short(first.date)} – ${short(last.date)}`,
        raised: group.reduce((s, p) => s + p.newTickets, 0),
        resolved: group.reduce((s, p) => s + p.resolvedTickets, 0),
        closed: group.reduce((s, p) => s + p.closedTickets, 0),
      });
    }
    return out;
  });

  protected readonly totals = computed(() =>
    this.buckets().reduce(
      (acc, b) => ({
        raised: acc.raised + b.raised,
        resolved: acc.resolved + b.resolved,
        closed: acc.closed + b.closed,
      }),
      { raised: 0, resolved: 0, closed: 0 },
    ),
  );

  protected readonly scale = computed(() => {
    const vis = this.visible();
    let peak = 0;
    for (const b of this.buckets()) {
      for (const s of this.seriesMeta) {
        if (vis[s.key]) peak = Math.max(peak, b[s.key]);
      }
    }
    return niceMax(peak);
  });

  protected readonly ticks = computed(() => {
    const { max, step } = this.scale();
    return [0, 1, 2, 3, 4].map((i) => ({
      value: i * step,
      // Percent from the top of the plot.
      top: 100 - (i * step * 100) / max,
    }));
  });

  /** x position (0–100) of bucket i. */
  protected xAt(i: number): number {
    const n = this.buckets().length;
    return n <= 1 ? 50 : (i / (n - 1)) * 100;
  }

  protected yAt(value: number): number {
    return 100 - (value * 100) / this.scale().max;
  }

  protected readonly paths = computed(() => {
    const { max } = this.scale();
    const buckets = this.buckets();
    const result = {} as Record<SeriesKey, { line: string; area: string }>;

    for (const s of this.seriesMeta) {
      const pts: Pt[] = buckets.map((b, i) => ({
        x: buckets.length <= 1 ? 50 : (i / (buckets.length - 1)) * 100,
        y: 100 - (b[s.key] * 100) / max,
      }));
      const line = monotonePath(pts);
      result[s.key] = { line, area: areaPath(line, pts, 100) };
    }
    return result;
  });

  protected readonly xLabels = computed(() => {
    const buckets = this.buckets();
    const n = buckets.length;
    if (n === 0) return [];
    const count = Math.min(n, 6);
    const idx = new Set<number>();
    for (let i = 0; i < count; i++) {
      idx.add(count === 1 ? 0 : Math.round((i / (count - 1)) * (n - 1)));
    }
    return [...idx].map((i) => ({
      i,
      left: this.xAt(i),
      text: buckets[i].label,
    }));
  });

  protected readonly activeBucket = computed(() => {
    const i = this.active();
    return i === null ? null : (this.buckets()[i] ?? null);
  });

  protected readonly activeSummary = computed(() => {
    const b = this.activeBucket();
    if (!b) return '';
    return `${b.title}: ${b.raised} raised, ${b.resolved} resolved, ${b.closed} closed.`;
  });

  protected readonly plotLabel = computed(() => {
    const t = this.totals();
    return `Ticket flow chart. ${t.raised} raised, ${t.resolved} resolved and ${t.closed} closed in total. Use the left and right arrow keys to read each point.`;
  });

  protected toggle(key: SeriesKey): void {
    const vis = this.visible();
    // Never allow an empty chart: keep at least one series on.
    if (vis[key] && Object.values(vis).filter(Boolean).length === 1) return;
    this.visible.set({ ...vis, [key]: !vis[key] });
  }

  protected onPointer(event: PointerEvent): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const n = this.buckets().length;
    if (n === 0 || rect.width === 0) return;

    const ratio = (event.clientX - rect.left) / rect.width;
    const index = n === 1 ? 0 : Math.round(ratio * (n - 1));
    this.active.set(Math.min(n - 1, Math.max(0, index)));
  }

  protected onKey(event: KeyboardEvent): void {
    const n = this.buckets().length;
    if (n === 0) return;
    const current = this.active();

    switch (event.key) {
      case 'ArrowRight':
        this.active.set(current === null ? 0 : Math.min(n - 1, current + 1));
        break;
      case 'ArrowLeft':
        this.active.set(current === null ? n - 1 : Math.max(0, current - 1));
        break;
      case 'Home':
        this.active.set(0);
        break;
      case 'End':
        this.active.set(n - 1);
        break;
      case 'Escape':
        this.active.set(null);
        return;
      default:
        return;
    }
    event.preventDefault();
  }

  protected clear(): void {
    this.active.set(null);
  }
}
