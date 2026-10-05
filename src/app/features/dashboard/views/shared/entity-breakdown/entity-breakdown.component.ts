import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { share } from '../report-base';
import {
  BarListComponent,
  BarListItem,
} from '../../../../../shared/charts/bar-list/bar-list.component';
import {
  ChartCardComponent,
  COMPOSITION_COLOR,
} from '../../../../../shared/charts/chart-theme';
import {
  AvatarComponent,
  EmptyStateComponent,
  IconComponent,
} from '../../../../../shared/ui';

/** One team, agent, customer or category, normalised for display. */
export interface EntityRow {
  readonly id: string;
  readonly name: string;
  /** Optional extra count shown as its own column, e.g. team members. */
  readonly secondary?: number;
  readonly total: number;
  readonly active: number;
  readonly resolved: number;
  readonly closed: number;
}

type SortKey =
  | 'name'
  | 'secondary'
  | 'total'
  | 'active'
  | 'resolved'
  | 'closed'
  | 'done';
type SortDir = 'asc' | 'desc';
type Metric = 'total' | 'active' | 'resolved' | 'closed';

const METRICS: readonly { key: Metric; label: string }[] = [
  { key: 'total', label: 'Total' },
  { key: 'active', label: 'Active' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

/** Plain-bar colour for each single-metric view of the chart. */
const METRIC_COLOR: Record<Exclude<Metric, 'total'>, string> = {
  active: COMPOSITION_COLOR.active,
  resolved: COMPOSITION_COLOR.resolved,
  closed: COMPOSITION_COLOR.closed,
};

/** Rows shown in the chart; beyond this the bars stop being scannable. */
const CHART_LIMIT = 10;
/** The filter box only earns its space once the table is long. */
const FILTER_THRESHOLD = 8;

/**
 * The body of the team, agent, customer and category reports. They differ
 * only in what the rows are called, so they share one layout: a ranked,
 * stacked chart (switchable by metric) beside a sortable, filterable table.
 *
 * Everything shown is a sum or ratio of the four counts each endpoint
 * returns — nothing is scored or estimated.
 */
@Component({
  selector: 'sc-entity-breakdown',
  standalone: true,
  imports: [
    FormsModule,
    BarListComponent,
    ChartCardComponent,
    AvatarComponent,
    IconComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './entity-breakdown.component.html',
  styleUrls: ['./entity-breakdown.component.css'],
})
export class EntityBreakdownComponent {
  readonly rows = input.required<readonly EntityRow[]>();
  /** Singular and plural nouns, lower case: "team" / "teams". */
  readonly noun = input<string>('item');
  readonly nounPlural = input<string>('items');
  /** Heading of the name column. */
  readonly nameHeading = input<string>('Name');
  /** Heading of the optional `secondary` column. */
  readonly secondaryHeading = input<string>('');
  readonly showAvatar = input<boolean>(false);
  readonly defaultSort = input<SortKey>('total');

  protected readonly metrics = METRICS;
  protected readonly metric = signal<Metric>('total');
  protected readonly sortKey = signal<SortKey | null>(null);
  protected readonly sortDir = signal<SortDir>('desc');
  protected readonly query = signal<string>('');

  protected readonly grand = computed(() =>
    this.rows().reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        active: acc.active + r.active,
        resolved: acc.resolved + r.resolved,
        closed: acc.closed + r.closed,
      }),
      { total: 0, active: 0, resolved: 0, closed: 0 },
    ),
  );

  // --- Insights: every line is derived from the endpoint's own counts ------

  /** Share of all tickets held by the three busiest entities. */
  protected readonly concentration = computed(() => {
    const rows = this.rows();
    const grand = this.grand().total;
    if (rows.length < 4 || grand <= 0) return null;

    const top = [...rows].sort((a, b) => b.total - a.total).slice(0, 3);
    const sum = top.reduce((s, r) => s + r.total, 0);
    return { percent: share(sum, grand) };
  });

  protected readonly heaviest = computed(() => {
    const ranked = [...this.rows()].sort((a, b) => b.active - a.active);
    const first = ranked[0];
    return first && first.active > 0 ? first : null;
  });

  protected readonly clearCount = computed(
    () => this.rows().filter((r) => r.active === 0).length,
  );

  // --- Chart ---------------------------------------------------------------

  protected readonly chartItems = computed<BarListItem[]>(() => {
    const metric = this.metric();

    return [...this.rows()]
      .sort((a, b) => b[metric] - a[metric] || a.name.localeCompare(b.name))
      .slice(0, CHART_LIMIT)
      .filter((r) => r[metric] > 0)
      .map((r) =>
        metric === 'total'
          ? {
              key: r.id,
              label: r.name,
              value: r.total,
              segments: [
                {
                  key: 'active',
                  label: 'Active',
                  value: r.active,
                  color: COMPOSITION_COLOR.active,
                },
                {
                  key: 'resolved',
                  label: 'Resolved',
                  value: r.resolved,
                  color: COMPOSITION_COLOR.resolved,
                },
                {
                  key: 'closed',
                  label: 'Closed',
                  value: r.closed,
                  color: COMPOSITION_COLOR.closed,
                },
              ],
            }
          : {
              key: r.id,
              label: r.name,
              value: r[metric],
              color: METRIC_COLOR[metric],
            },
      );
  });

  protected readonly chartTotal = computed(() => {
    const g = this.grand();
    return g[this.metric()];
  });

  protected readonly metricLabel = computed(
    () => METRICS.find((m) => m.key === this.metric())?.label ?? 'Total',
  );

  // --- Table ---------------------------------------------------------------

  protected readonly effectiveKey = computed<SortKey>(
    () => this.sortKey() ?? this.defaultSort(),
  );

  protected readonly showFilter = computed(
    () => this.rows().length > FILTER_THRESHOLD,
  );

  protected readonly tableRows = computed(() => {
    const key = this.effectiveKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    const q = this.query().trim().toLowerCase();

    const value = (r: EntityRow): number | string =>
      key === 'name'
        ? r.name.toLowerCase()
        : key === 'secondary'
          ? (r.secondary ?? 0)
          : key === 'done'
            ? this.doneOf(r)
            : r[key];

    return this.rows()
      .filter((r) => !q || r.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const av = value(a);
        const bv = value(b);
        const cmp =
          typeof av === 'string' && typeof bv === 'string'
            ? av.localeCompare(bv)
            : (av as number) - (bv as number);
        return cmp * dir || a.name.localeCompare(b.name);
      });
  });

  protected selectMetric(metric: Metric): void {
    this.metric.set(metric);
  }

  protected sortBy(key: SortKey): void {
    if (this.effectiveKey() === key) {
      this.sortDir.set(this.sortDir() === 'desc' ? 'asc' : 'desc');
    } else {
      this.sortKey.set(key);
      // Names read A to Z; every count reads biggest first.
      this.sortDir.set(key === 'name' ? 'asc' : 'desc');
    }
  }

  protected ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (this.effectiveKey() !== key) return 'none';
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  protected sortIcon(key: SortKey): string {
    if (this.effectiveKey() !== key) return 'unfold_more';
    return this.sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  protected setQuery(value: string): void {
    this.query.set(value);
  }

  /** Percent of a row's tickets that are resolved or closed. */
  protected doneOf(row: EntityRow): number {
    return share(row.resolved + row.closed, row.total);
  }

  protected pct(value: number, total: number): number {
    return share(value, total);
  }
}
