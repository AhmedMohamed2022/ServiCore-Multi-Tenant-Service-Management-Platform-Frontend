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
  TicketStatisticsResponse,
} from '../../models/reporting.model';
import { previousPeriod, share } from '../shared/report-base';
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
} from '../../../../shared/ui/states/states.component';
import {
  TicketPriorityBadgeComponent,
  TicketStatusBadgeComponent,
} from '../../../../shared/ticket/ticket-badges.component';
import {
  ChartCardComponent,
  PRIORITY_COLOR,
  STATUS_COLOR,
} from '../../../../shared/charts/chart-theme';

import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import {
  BarListComponent,
  BarListItem,
} from '../../../../shared/charts/bar-list/bar-list.component';
import { DeltaChipComponent } from '../../../../shared/charts/delta-chip/delta-chip.component';
import {
  DonutComponent,
  DonutSlice,
} from '../../../../shared/charts/donut/donut.component';
import { ReportSkeletonComponent } from '../shared/report-skeleton/report-skeleton.component';

@Component({
  selector: 'app-ticket-statistics',
  standalone: true,
  imports: [
    ReportRangeComponent,
    ReportSkeletonComponent,
    BarListComponent,
    DonutComponent,
    DeltaChipComponent,
    PageHeaderComponent,
    StatCardComponent,
    AlertComponent,
    EmptyStateComponent,
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

  private readonly destroyRef = inject(DestroyRef);
  private mainSub?: Subscription;
  private previousSub?: Subscription;

  /** Total tickets in the window before this one, for the delta chip. */
  readonly previousTotal = signal<number | null>(null);

  /** Linked hover between each ring and its legend rows. */
  readonly statusActive = signal<string | null>(null);
  readonly priorityActive = signal<string | null>(null);

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
      color: STATUS_COLOR[status],
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
      color: PRIORITY_COLOR[priority],
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

  readonly statusSlices = computed<DonutSlice[]>(() =>
    this.statusBreakdown().map((row) => ({
      key: String(row.status),
      label: row.label,
      value: row.count,
      color: row.color,
    })),
  );

  readonly prioritySlices = computed<DonutSlice[]>(() =>
    this.priorityBreakdown().map((row) => ({
      key: String(row.priority),
      label: row.label,
      value: row.count,
      color: row.color,
    })),
  );

  /** Top ten categories by volume, as ranked bars. */
  readonly categoryItems = computed<BarListItem[]>(() =>
    [...(this.stats()?.categoryDistribution ?? [])]
      .sort((a, b) => b.ticketCount - a.ticketCount)
      .slice(0, 10)
      .map((row) => ({
        key: row.categoryId,
        label: row.categoryName,
        value: row.ticketCount,
      })),
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

    // A newer request supersedes an older one, so a slow response to an old
    // range can never overwrite a newer answer.
    this.mainSub?.unsubscribe();
    this.mainSub = this.reportingService
      .getTicketStatistics(this.range())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.stats.set(result);
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
    this.previousTotal.set(null);

    const prior = previousPeriod(this.range());
    if (!prior) return;

    this.previousSub = this.reportingService
      .getTicketStatistics(prior)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) =>
          this.previousTotal.set(
            result.statusDistribution.reduce((sum, r) => sum + r.count, 0),
          ),
        error: () => this.previousTotal.set(null),
      });
  }

  shareOf(value: number, total: number): number {
    return share(value, total);
  }
}
