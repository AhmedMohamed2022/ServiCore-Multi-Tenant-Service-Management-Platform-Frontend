import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/** One coloured part of a stacked bar. */
export interface BarListSegment {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  /** A CSS colour — in practice a `var(--sc-*)` token reference. */
  readonly color: string;
}

export interface BarListItem {
  readonly key: string;
  readonly label: string;
  /** The value the bar length represents. For stacked bars: the sum. */
  readonly value: number;
  /** Optional stacked breakdown; when present it paints the bar. */
  readonly segments?: readonly BarListSegment[];
  /** Fill colour for a plain bar. Defaults to the brand gradient. */
  readonly color?: string;
}

/**
 * Ranked horizontal bars, built from HTML and CSS rather than a chart
 * library. Every number is printed as text next to its bar and the bars
 * themselves are hidden from assistive technology, so the list reads fine
 * without seeing the geometry at all.
 */
@Component({
  selector: 'sc-bar-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bar-list.component.html',
  styleUrls: ['./bar-list.component.css'],
})
export class BarListComponent {
  readonly items = input.required<readonly BarListItem[]>();
  /** Denominator for the percentage shown beside each value. */
  readonly total = input<number | null>(null);
  /** Noun used in the accessible summary, e.g. "tickets". */
  readonly unit = input<string>('tickets');
  readonly showRank = input<boolean>(true);
  /** Accessible name for the list. */
  readonly label = input<string>('Ranking');

  /** Bars are scaled to the largest value in view, not to the total. */
  protected readonly peak = computed(() =>
    Math.max(1, ...this.items().map((i) => i.value)),
  );

  /** Legend is derived from the first stacked item. */
  protected readonly legend = computed(() => {
    const first = this.items().find((i) => i.segments?.length);
    return first?.segments ?? [];
  });

  protected widthOf(item: BarListItem): number {
    return (item.value / this.peak()) * 100;
  }

  protected percentOf(item: BarListItem): number | null {
    const total = this.total();
    if (total === null || total <= 0) return null;
    return Math.round((item.value / total) * 100);
  }

  protected segmentSummary(item: BarListItem): string {
    return (item.segments ?? []).map((s) => `${s.label} ${s.value}`).join(', ');
  }
}
