import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
} from '@angular/core';

export interface DonutSlice {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  /** A CSS colour — in practice a `var(--sc-*)` token reference. */
  readonly color: string;
}

/** Circumference of the ring is normalised to 100 so lengths are percents. */
const RADIUS = 15.9155;
/** Visible gap between neighbouring slices, in percent of the ring. */
const GAP = 0.9;

let nextId = 0;

/**
 * A ring chart with the total (or the hovered slice) in the middle. Pure
 * SVG, so every fill is a design token. It is decorative for assistive
 * technology: callers always print the same numbers as text beside it (the
 * legend), and this component adds a one-sentence summary for screen readers.
 */
@Component({
  selector: 'sc-donut',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './donut.component.html',
  styleUrls: ['./donut.component.css'],
})
export class DonutComponent {
  readonly slices = input.required<readonly DonutSlice[]>();
  /** Noun printed under the total, e.g. "tickets". */
  readonly centerLabel = input<string>('tickets');
  /** Key of the slice to emphasise; bind it to a legend for linked hover. */
  readonly active = model<string | null>(null);

  protected readonly titleId = `dn-title-${nextId++}`;

  protected readonly total = computed(() =>
    this.slices().reduce((sum, s) => sum + s.value, 0),
  );

  protected readonly arcs = computed(() => {
    const total = this.total();
    if (total <= 0) return [];

    const live = this.slices().filter((s) => s.value > 0);
    const gap = live.length > 1 ? GAP : 0;
    let offset = 0;

    return live.map((slice) => {
      const length = (slice.value / total) * 100;
      const arc = {
        slice,
        dash: `${Math.max(length - gap, 0.2)} ${100 - Math.max(length - gap, 0.2)}`,
        offset: -offset,
      };
      offset += length;
      return arc;
    });
  });

  protected readonly focused = computed(() => {
    const key = this.active();
    return key === null
      ? null
      : (this.slices().find((s) => s.key === key) ?? null);
  });

  protected readonly centerValue = computed(
    () => this.focused()?.value ?? this.total(),
  );

  protected readonly centerText = computed(() => {
    const f = this.focused();
    if (!f) return this.centerLabel();
    const total = this.total();
    const pct = total > 0 ? Math.round((f.value / total) * 100) : 0;
    return `${f.label} · ${pct}%`;
  });

  protected readonly summary = computed(() => {
    const total = this.total();
    if (total <= 0) return 'No data';
    const parts = this.slices()
      .filter((s) => s.value > 0)
      .map((s) => `${s.label} ${s.value}`);
    return `${total} ${this.centerLabel()}: ${parts.join(', ')}.`;
  });

  protected readonly r = RADIUS;
}
