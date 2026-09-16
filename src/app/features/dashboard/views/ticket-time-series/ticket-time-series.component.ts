import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { LegendPosition, NgxChartsModule } from '@swimlane/ngx-charts';

import { ReportingService } from '../../../../core/services/reporting.service';
import {
  ReportDateRangeRequest,
  TicketTimeSeriesPointData,
} from '../../models/reporting.model';
import { ReportRangeComponent } from '../shared/report-range.component';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { StatCardComponent } from '../../../../shared/ui/stat-card/stat-card.component';
import {
  AlertComponent,
  EmptyStateComponent,
  LoadingStateComponent,
} from '../../../../shared/ui/states/states.component';
import { ChartCardComponent } from '../../../../shared/charts/chart-theme';

/** ngx-charts multi-series shape. */
interface ChartSeries {
  name: string;
  series: { name: string; value: number }[];
}

/**
 * Colours for the three plotted series. Raised is neutral-blue, resolved is
 * the same green as the Resolved badge, closed the same slate as Closed — so
 * the trend lines and the status badges agree.
 */
const TREND_SCHEME = {
  name: 'servicore-trend',
  selectable: true,
  group: 'Ordinal',
  domain: ['#60a5fa', '#059669', '#64748b'],
} as any;

@Component({
  selector: 'app-ticket-time-series',
  standalone: true,
  imports: [
    NgxChartsModule,
    ReportRangeComponent,
    PageHeaderComponent,
    StatCardComponent,
    AlertComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    ChartCardComponent,
  ],
  templateUrl: './ticket-time-series.component.html',
})
export class TicketTimeSeriesComponent implements OnInit {
  private readonly reportingService = inject(ReportingService);

  readonly points = signal<TicketTimeSeriesPointData[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly range = signal<ReportDateRangeRequest>({});

  readonly trendColors = TREND_SCHEME;
  readonly legendBelow = LegendPosition.Below;

  readonly hasData = computed(() => this.points().length > 0);

  /**
   * Replaces roughly 170 lines of hand-computed SVG path maths — viewBox
   * constants, manual axis ticks, label thinning — with the charting library
   * the rest of the reporting surface already uses. Same three series, same
   * source fields.
   */
  readonly chartSeries = computed<ChartSeries[]>(() => {
    const data = this.points();
    if (data.length === 0) return [];

    const label = (point: TicketTimeSeriesPointData) =>
      new Date(point.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });

    return [
      {
        name: 'Raised',
        series: data.map((p) => ({ name: label(p), value: p.newTickets })),
      },
      {
        name: 'Resolved',
        series: data.map((p) => ({ name: label(p), value: p.resolvedTickets })),
      },
      {
        name: 'Closed',
        series: data.map((p) => ({ name: label(p), value: p.closedTickets })),
      },
    ];
  });

  readonly totals = computed(() =>
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

    this.reportingService.getTicketTimeSeries(this.range()).subscribe({
      next: (result) => {
        // Chronological order isn't guaranteed by the endpoint — sort
        // defensively, otherwise the line doubles back on itself.
        this.points.set(
          [...result].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          ),
        );
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  formatDay(date: string): string {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
