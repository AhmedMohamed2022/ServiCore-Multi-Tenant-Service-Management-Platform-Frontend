import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { LegendPosition, NgxChartsModule } from '@swimlane/ngx-charts';

import { ReportingService } from '../../../../core/services/reporting.service';
import {
  ReportDateRangeRequest,
  TicketStatisticsResponse,
} from '../../models/reporting.model';
import { share } from '../shared/report-base';
import { ReportRangeComponent } from '../shared/report-range.component';

import {
  TicketPriority,
  TicketPriorityLabels,
  TicketStatus,
  TicketStatusLabels,
  TICKET_PRIORITY_ORDER,
  TICKET_STATUS_ORDER,
  isActiveStatus,
} from '../../../tickets/models/ticket-enums.model';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { StatCardComponent } from '../../../../shared/ui/stat-card/stat-card.component';
import {
  AlertComponent,
  EmptyStateComponent,
  LoadingStateComponent,
} from '../../../../shared/ui/states/states.component';
import {
  TicketPriorityBadgeComponent,
  TicketStatusBadgeComponent,
} from '../../../../shared/ticket/ticket-badges.component';
import {
  CATEGORICAL_COLOR_SCHEME,
  ChartCardComponent,
  PRIORITY_COLOR_SCHEME,
  PRIORITY_HEX,
  STATUS_COLOR_SCHEME,
  STATUS_HEX,
} from '../../../../shared/charts/chart-theme';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';

@Component({
  selector: 'app-ticket-statistics',
  standalone: true,
  imports: [
    NgxChartsModule,
    ReportRangeComponent,
    PageHeaderComponent,
    StatCardComponent,
    AlertComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    TicketStatusBadgeComponent,
    TicketPriorityBadgeComponent,
    ChartCardComponent,
    DurationPipe,
  ],
  templateUrl: './ticket-statistics.component.html',
  styleUrls: ['./ticket-statistics.component.css'],
})
export class TicketStatisticsComponent implements OnInit {
  private readonly reportingService = inject(ReportingService);

  readonly stats = signal<TicketStatisticsResponse | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly range = signal<ReportDateRangeRequest>({});

  readonly statusColors = STATUS_COLOR_SCHEME;
  readonly priorityColors = PRIORITY_COLOR_SCHEME;
  readonly categoryColors = CATEGORICAL_COLOR_SCHEME;
  readonly legendBelow = LegendPosition.Below;

  readonly totalTickets = computed(() =>
    (this.stats()?.statusDistribution ?? []).reduce(
      (sum, row) => sum + row.count,
      0,
    ),
  );

  readonly hasData = computed(() => this.totalTickets() > 0);

  /**
   * Every status in workflow order, including the ones with no tickets. The
   * endpoint only returns statuses that have rows, so reading it directly
   * would silently drop "New: 0" — and a zero in a status distribution is
   * information, not absence of it.
   */
  readonly statusBreakdown = computed(() => {
    const counts = new Map(
      (this.stats()?.statusDistribution ?? []).map((row) => [
        row.status,
        row.count,
      ]),
    );
    const total = this.totalTickets();

    return TICKET_STATUS_ORDER.map((status) => ({
      status,
      label: TicketStatusLabels[status],
      count: counts.get(status) ?? 0,
      percent: share(counts.get(status) ?? 0, total),
      color: STATUS_HEX[status],
    }));
  });

  readonly priorityBreakdown = computed(() => {
    const counts = new Map(
      (this.stats()?.priorityDistribution ?? []).map((row) => [
        row.priority,
        row.count,
      ]),
    );
    const total = this.totalTickets();

    return TICKET_PRIORITY_ORDER.map((priority) => ({
      priority,
      label: TicketPriorityLabels[priority],
      count: counts.get(priority) ?? 0,
      percent: share(counts.get(priority) ?? 0, total),
      color: PRIORITY_HEX[priority],
    }));
  });

  /** Workload still in flight, using the shared active-status definition. */
  readonly activeTickets = computed(() =>
    this.statusBreakdown()
      .filter((row) => isActiveStatus(row.status))
      .reduce((sum, row) => sum + row.count, 0),
  );

  readonly criticalCount = computed(
    () =>
      this.priorityBreakdown().find(
        (row) => row.priority === TicketPriority.Critical,
      )?.count ?? 0,
  );

  readonly statusChartData = computed(() =>
    this.statusBreakdown()
      .filter((row) => row.count > 0)
      .map((row) => ({ name: row.label, value: row.count })),
  );

  readonly priorityChartData = computed(() =>
    this.priorityBreakdown()
      .filter((row) => row.count > 0)
      .map((row) => ({ name: row.label, value: row.count })),
  );

  readonly categoryChartData = computed(() =>
    [...(this.stats()?.categoryDistribution ?? [])]
      .sort((a, b) => b.ticketCount - a.ticketCount)
      .slice(0, 10)
      .map((row) => ({ name: row.categoryName, value: row.ticketCount })),
  );

  readonly categoryRows = computed(() =>
    [...(this.stats()?.categoryDistribution ?? [])].sort(
      (a, b) => b.ticketCount - a.ticketCount,
    ),
  );

  protected readonly TicketStatus = TicketStatus;

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

    this.reportingService.getTicketStatistics(this.range()).subscribe({
      next: (result) => {
        this.stats.set(result);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  shareOf(value: number, total: number): number {
    return share(value, total);
  }
}
