import {
  Component,
  DestroyRef,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';

import { ReportingService } from '../../../../core/services/reporting.service';
import {
  ReportDateRangeRequest,
  TicketTimeSeriesPointData,
} from '../../models/reporting.model';
import { previousPeriod } from '../shared/report-base';
import { ReportRangeComponent } from '../shared/report-range.component';
import { TrendChartComponent } from '../../widgets/trend-chart/trend-chart.component';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { StatCardComponent } from '../../../../shared/ui/stat-card/stat-card.component';
import {
  AlertComponent,
  EmptyStateComponent,
} from '../../../../shared/ui/states/states.component';
import { ChartCardComponent } from '../../../../shared/charts/chart-theme';
import {
  BarListItem,
  BarListComponent,
} from '../../../../shared/charts/bar-list/bar-list.component';
import { DeltaChipComponent } from '../../../../shared/charts/delta-chip/delta-chip.component';
import { ReportSkeletonComponent } from '../shared/report-skeleton/report-skeleton.component';

interface PeriodTotals {
  readonly raised: number;
  readonly resolved: number;
  readonly closed: number;
}

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/** Fewer days than this and a weekday pattern is just noise. */
const WEEKDAY_MIN_DAYS = 14;

@Component({
  selector: 'app-ticket-time-series',
  standalone: true,
  imports: [
    ReportRangeComponent,
    ReportSkeletonComponent,
    TrendChartComponent,
    PageHeaderComponent,
    StatCardComponent,
    AlertComponent,
    EmptyStateComponent,
    ChartCardComponent,
    AlertComponent,
    DeltaChipComponent,
    BarListComponent,
  ],
  templateUrl: './ticket-time-series.component.html',
})
export class TicketTimeSeriesComponent implements OnInit {
  private readonly reportingService = inject(ReportingService);
  private readonly destroyRef = inject(DestroyRef);
  private mainSub?: Subscription;
  private previousSub?: Subscription;

  readonly points = signal<TicketTimeSeriesPointData[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly range = signal<ReportDateRangeRequest>({});

  /** Totals for the window before this one, for the delta chips. */
  readonly previousTotals = signal<PeriodTotals | null>(null);

  readonly hasData = computed(() => this.points().length > 0);

  readonly totals = computed<PeriodTotals>(() =>
    this.points().reduce(
      (acc, p) => ({
        raised: acc.raised + p.newTickets,
        resolved: acc.resolved + p.resolvedTickets,
        closed: acc.closed + p.closedTickets,
      }),
      { raised: 0, resolved: 0, closed: 0 },
    ),
  );

  /**
   * Whether the team is keeping up: tickets finished minus tickets raised
   * over the period. Positive means the backlog shrank.
   */
  readonly netChange = computed(() => {
    const t = this.totals();
    return t.resolved + t.closed - t.raised;
  });

  readonly busiestDay = computed(() => {
    const ranked = [...this.points()].sort(
      (a, b) => b.newTickets - a.newTickets,
    );
    return ranked[0] ?? null;
  });

  /**
   * Tickets raised per day of the week, summed over the period. Only offered
   * once there are two full weeks of data to speak of a pattern.
   */
  readonly weekdayItems = computed<BarListItem[]>(() => {
    const points = this.points();
    if (points.length < WEEKDAY_MIN_DAYS) return [];

    const sums = new Array<number>(7).fill(0);
    for (const p of points) {
      // Read the calendar date as written, so a UTC midnight does not slip
      // into the previous day in negative-offset time zones.
      const [y, m, d] = p.date.slice(0, 10).split('-').map(Number);
      const jsDay = new Date(y, m - 1, d).getDay();
      sums[(jsDay + 6) % 7] += p.newTickets;
    }

    return WEEKDAYS.map((label, i) => ({
      key: label,
      label,
      value: sums[i],
    }));
  });

  readonly busiestWeekday = computed(() => {
    const items = this.weekdayItems();
    if (items.length === 0) return null;
    const top = items.reduce((a, b) => (b.value > a.value ? b : a));
    return top.value > 0 ? top : null;
  });

  ngOnInit(): void {
    this.fetchData();
  }

  onRangeChange(range: ReportDateRangeRequest): void {
    this.range.set(range);
    this.fetchData();
  }

  fetchData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // A newer request supersedes an older one.
    this.mainSub?.unsubscribe();
    this.mainSub = this.reportingService
      .getTicketTimeSeries(this.range())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          // Chronological order isn't guaranteed by the endpoint — sort
          // defensively, otherwise the line doubles back on itself.
          this.points.set(this.sorted(result));
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.errorMessage.set(err.message);
          this.isLoading.set(false);
        },
      });

    this.fetchPrevious();
  }

  /**
   * The same endpoint over the window just before this one. It is its own
   * request: if it fails the page simply shows no comparison.
   */
  private fetchPrevious(): void {
    this.previousSub?.unsubscribe();
    this.previousTotals.set(null);

    const prior = previousPeriod(this.range());
    if (!prior) return;

    this.previousSub = this.reportingService
      .getTicketTimeSeries(prior)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) =>
          this.previousTotals.set(
            result.reduce<PeriodTotals>(
              (acc, p) => ({
                raised: acc.raised + p.newTickets,
                resolved: acc.resolved + p.resolvedTickets,
                closed: acc.closed + p.closedTickets,
              }),
              { raised: 0, resolved: 0, closed: 0 },
            ),
          ),
        error: () => this.previousTotals.set(null),
      });
  }

  private sorted(
    result: TicketTimeSeriesPointData[],
  ): TicketTimeSeriesPointData[] {
    return [...result].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }

  formatDay(date: string): string {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
