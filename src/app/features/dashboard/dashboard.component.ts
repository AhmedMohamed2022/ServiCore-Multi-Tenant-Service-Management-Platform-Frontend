import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LegendPosition, NgxChartsModule } from '@swimlane/ngx-charts';

import { ReportingService } from '../../core/services/reporting.service';
import { TicketService } from '../../core/services/ticket.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { DashboardOverviewResponse } from './models/reporting.model';
import { TicketDto } from '../tickets/models/ticket.model';
import {
  TicketPriority,
  TicketStatus,
  TicketStatusLabels,
} from '../tickets/models/ticket-enums.model';

import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { StatCardComponent } from '../../shared/ui/stat-card/stat-card.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import {
  AlertComponent,
  EmptyStateComponent,
  LoadingStateComponent,
} from '../../shared/ui/states/states.component';
import {
  TicketPriorityBadgeComponent,
  TicketStatusBadgeComponent,
} from '../../shared/ticket/ticket-badges.component';
import { DurationPipe } from '../../shared/pipes/duration.pipe';
import {
  ChartCardComponent,
  PRIORITY_COLOR_SCHEME,
  STATUS_COLOR_SCHEME,
  STATUS_HEX,
} from '../../shared/charts/chart-theme';

interface ChartDatum {
  name: string;
  value: number;
  extra?: { status?: TicketStatus };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NgxChartsModule,
    PageHeaderComponent,
    StatCardComponent,
    ChartCardComponent,
    IconComponent,
    AlertComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    TicketStatusBadgeComponent,
    TicketPriorityBadgeComponent,
    DurationPipe,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  private readonly reportingService = inject(ReportingService);
  private readonly ticketService = inject(TicketService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly metrics = signal<DashboardOverviewResponse | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  /** Recent activity comes from the existing tickets endpoint, not a new metric. */
  readonly recentTickets = signal<TicketDto[]>([]);
  readonly isLoadingRecent = signal<boolean>(false);

  readonly legendBelow = LegendPosition.Below;
  readonly statusColors = STATUS_COLOR_SCHEME;
  readonly priorityColors = PRIORITY_COLOR_SCHEME;

  readonly userEmail = computed(
    () => this.authService.currentUser()?.email ?? 'there',
  );

  readonly filterForm = this.fb.group({
    from: [''],
    to: [''],
  });

  readonly hasActiveFilter = computed(() => {
    const { from, to } = this.filterForm.value;
    return !!from || !!to;
  });

  // ---------------------------------------------------------------------
  // Derived views over the overview DTO. Nothing here invents a metric —
  // every figure is a field the backend already returns, or a sum of them.
  // ---------------------------------------------------------------------

  /** Live work: everything that is neither resolved nor closed. */
  readonly activeTickets = computed(() => {
    const overview = this.metrics()?.ticketOverview;
    if (!overview) return 0;
    return (
      overview.newTickets +
      overview.openTickets +
      overview.inProgressTickets +
      overview.waitingForCustomerTickets
    );
  });

  readonly unassignedHint = computed(() => {
    const overview = this.metrics()?.ticketOverview;
    if (!overview) return '';
    return `${overview.newTickets} new, ${overview.inProgressTickets} in progress`;
  });

  readonly statusChartData = computed<ChartDatum[]>(() => {
    const overview = this.metrics()?.ticketOverview;
    if (!overview) return [];

    return [
      { name: TicketStatusLabels[TicketStatus.New], value: overview.newTickets },
      { name: TicketStatusLabels[TicketStatus.Open], value: overview.openTickets },
      { name: TicketStatusLabels[TicketStatus.InProgress], value: overview.inProgressTickets },
      {
        name: TicketStatusLabels[TicketStatus.WaitingForCustomer],
        value: overview.waitingForCustomerTickets,
      },
      { name: TicketStatusLabels[TicketStatus.Resolved], value: overview.resolvedTickets },
      { name: TicketStatusLabels[TicketStatus.Closed], value: overview.closedTickets },
    ];
  });

  readonly priorityChartData = computed<ChartDatum[]>(() => {
    const priority = this.metrics()?.priorityStatistics;
    if (!priority) return [];

    return [
      { name: 'Low', value: priority.low },
      { name: 'Medium', value: priority.medium },
      { name: 'High', value: priority.high },
      { name: 'Critical', value: priority.critical },
    ];
  });

  readonly hasAnyTickets = computed(
    () => (this.metrics()?.ticketOverview.totalTickets ?? 0) > 0,
  );

  /** Status rows for the breakdown list beside the chart. */
  readonly statusBreakdown = computed(() => {
    const overview = this.metrics()?.ticketOverview;
    if (!overview) return [];

    const total = overview.totalTickets || 1;
    const rows: { status: TicketStatus; count: number }[] = [
      { status: TicketStatus.New, count: overview.newTickets },
      { status: TicketStatus.Open, count: overview.openTickets },
      { status: TicketStatus.InProgress, count: overview.inProgressTickets },
      { status: TicketStatus.WaitingForCustomer, count: overview.waitingForCustomerTickets },
      { status: TicketStatus.Resolved, count: overview.resolvedTickets },
      { status: TicketStatus.Closed, count: overview.closedTickets },
    ];

    return rows.map((row) => ({
      ...row,
      percent: Math.round((row.count / total) * 100),
      color: STATUS_HEX[row.status],
    }));
  });

  ngOnInit(): void {
    this.fetchAnalyticsData();
    this.fetchRecentTickets();
  }

  fetchAnalyticsData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const formValues = this.filterForm.value;
    const requestFilters = {
      from: formValues.from ? new Date(formValues.from).toISOString() : undefined,
      to: formValues.to ? new Date(formValues.to).toISOString() : undefined,
    };

    this.reportingService.getDashboardOverview(requestFilters).subscribe({
      next: (data) => {
        this.metrics.set(data);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  private fetchRecentTickets(): void {
    this.isLoadingRecent.set(true);

    this.ticketService.getTickets().subscribe({
      next: (tickets) => {
        const sorted = [...tickets].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        this.recentTickets.set(sorted.slice(0, 6));
        this.isLoadingRecent.set(false);
      },
      // A failure here must not take the whole dashboard down — the panel
      // just renders its empty state instead.
      error: () => this.isLoadingRecent.set(false),
    });
  }

  onApplyFilters(): void {
    this.fetchAnalyticsData();
  }

  onResetFilters(): void {
    this.filterForm.reset({ from: '', to: '' });
    this.fetchAnalyticsData();
  }

  protected readonly TicketPriority = TicketPriority;
}
