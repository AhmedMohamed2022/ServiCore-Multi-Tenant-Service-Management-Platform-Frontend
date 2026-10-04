import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, Subscription } from 'rxjs';

import { ReportingService } from '../../core/services/reporting.service';
import { TicketService } from '../../core/services/ticket.service';
import { AuthService } from '../../core/auth/services/auth.service';
import {
  AgentStatisticsData,
  CategoryStatisticsData,
  DashboardOverviewResponse,
  ReportDateRangeRequest,
  TeamStatisticsData,
  TicketTimeSeriesPointData,
} from './models/reporting.model';
import { TicketDto } from '../tickets/models/ticket.model';
import {
  TicketPriority,
  TicketPriorityLabels,
  TicketStatus,
  TicketStatusLabels,
} from '../tickets/models/ticket-enums.model';

import { IconComponent } from '../../shared/ui/icon/icon.component';
import { AvatarComponent } from '../../shared/ui/avatar/avatar.component';
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
import { ReportRangeComponent } from './views/shared/report-range.component';
import { TrendChartComponent } from './widgets/trend-chart/trend-chart.component';
import { SparklineComponent } from './widgets/sparkline/sparkline.component';
import { CountUpDirective } from './widgets/directives/count-up.directive';

type BreakdownTab = 'teams' | 'agents' | 'categories';

interface WidgetState {
  loading: WritableSignal<boolean>;
  error: WritableSignal<string | null>;
}

/** One row of the teams / agents / categories breakdown. */
interface BreakdownRow {
  id: string;
  name: string;
  sub: string;
  total: number;
  active: number;
  resolved: number;
  closed: number;
  /** Segment widths as a percent of the busiest row, so rows compare. */
  activePct: number;
  resolvedPct: number;
  closedPct: number;
}

/** Status → the suffix of its `--sc-status-*` token. */
const STATUS_ROWS: readonly { status: TicketStatus; token: string }[] = [
  { status: TicketStatus.New, token: 'new' },
  { status: TicketStatus.Open, token: 'open' },
  { status: TicketStatus.InProgress, token: 'progress' },
  { status: TicketStatus.WaitingForCustomer, token: 'waiting' },
  { status: TicketStatus.Resolved, token: 'resolved' },
  { status: TicketStatus.Closed, token: 'closed' },
];

const BREAKDOWN_LIMIT = 6;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IconComponent,
    AvatarComponent,
    AlertComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    TicketStatusBadgeComponent,
    TicketPriorityBadgeComponent,
    DurationPipe,
    ReportRangeComponent,
    TrendChartComponent,
    SparklineComponent,
    CountUpDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  private readonly reportingService = inject(ReportingService);
  private readonly ticketService = inject(TicketService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  /** One in-flight request per widget; a newer one cancels the older. */
  private readonly inflight = new Map<string, Subscription>();

  // ---------------------------------------------------------------------
  // State. Each data source loads and fails on its own, so one slow or
  // broken endpoint never blanks the whole dashboard.
  // ---------------------------------------------------------------------

  readonly range = signal<ReportDateRangeRequest>({});

  readonly metrics = signal<DashboardOverviewResponse | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly trendPoints = signal<TicketTimeSeriesPointData[]>([]);
  readonly trend: WidgetState = this.widget();

  readonly teams = signal<TeamStatisticsData[]>([]);
  readonly agents = signal<AgentStatisticsData[]>([]);
  readonly categories = signal<CategoryStatisticsData[]>([]);
  readonly teamsState: WidgetState = this.widget();
  readonly agentsState: WidgetState = this.widget();
  readonly categoriesState: WidgetState = this.widget();

  /** Every ticket the user can see: feeds Recent and Needs attention. */
  readonly allTickets = signal<TicketDto[]>([]);
  readonly isLoadingRecent = signal<boolean>(false);
  readonly ticketsLoaded = signal<boolean>(false);

  readonly breakdownTab = signal<BreakdownTab>('teams');

  readonly today = new Date();
  protected readonly TicketPriority = TicketPriority;

  // ---------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------

  readonly greeting = computed(() => {
    const hour = this.today.getHours();
    if (hour < 5) return 'Working late';
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  });

  /** "maya.owner@acme.test" → "Maya". Empty when we can't tell. */
  readonly firstName = computed(() => {
    const email = this.authService.currentUser()?.email;
    if (!email) return '';
    const word = email
      .split('@')[0]
      .split(/[^a-zA-Z]+/)
      .filter(Boolean)[0];
    return word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : '';
  });

  readonly hasActiveFilter = computed(() => {
    const { from, to } = this.range();
    return !!from || !!to;
  });

  // ---------------------------------------------------------------------
  // Derived from the overview DTO. Nothing here invents a metric: every
  // figure is a field the backend returns, or a sum or ratio of them.
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

  /** Share of tickets that are resolved or closed, 0–100. */
  readonly completionRate = computed(() => {
    const overview = this.metrics()?.ticketOverview;
    if (!overview || overview.totalTickets === 0) return 0;
    return Math.round(
      ((overview.resolvedTickets + overview.closedTickets) /
        overview.totalTickets) *
        100,
    );
  });

  readonly finishedTickets = computed(() => {
    const overview = this.metrics()?.ticketOverview;
    return overview ? overview.resolvedTickets + overview.closedTickets : 0;
  });

  readonly hasAnyTickets = computed(
    () => (this.metrics()?.ticketOverview.totalTickets ?? 0) > 0,
  );

  /** Status rows for the pipeline bar and its tiles. */
  readonly statusBreakdown = computed(() => {
    const overview = this.metrics()?.ticketOverview;
    if (!overview) return [];

    const counts: Record<number, number> = {
      [TicketStatus.New]: overview.newTickets,
      [TicketStatus.Open]: overview.openTickets,
      [TicketStatus.InProgress]: overview.inProgressTickets,
      [TicketStatus.WaitingForCustomer]: overview.waitingForCustomerTickets,
      [TicketStatus.Resolved]: overview.resolvedTickets,
      [TicketStatus.Closed]: overview.closedTickets,
    };
    const total = overview.totalTickets || 1;

    return STATUS_ROWS.map((row) => ({
      status: row.status,
      label: TicketStatusLabels[row.status],
      count: counts[row.status],
      percent: Math.round((counts[row.status] / total) * 100),
      color: `var(--sc-status-${row.token})`,
    }));
  });

  /** Highest severity first, because that is what a lead scans for. */
  readonly priorityRows = computed(() => {
    const p = this.metrics()?.priorityStatistics;
    if (!p) return [];
    const total = p.low + p.medium + p.high + p.critical || 1;

    return [
      {
        priority: TicketPriority.Critical,
        value: p.critical,
        token: 'critical',
      },
      { priority: TicketPriority.High, value: p.high, token: 'high' },
      { priority: TicketPriority.Medium, value: p.medium, token: 'medium' },
      { priority: TicketPriority.Low, value: p.low, token: 'low' },
    ].map((row) => ({
      label: TicketPriorityLabels[row.priority],
      value: row.value,
      percent: Math.round((row.value / total) * 100),
      color: `var(--sc-priority-${row.token})`,
    }));
  });

  // ---------------------------------------------------------------------
  // Derived from the time series
  // ---------------------------------------------------------------------

  private readonly sortedPoints = computed(() =>
    [...this.trendPoints()].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    ),
  );

  readonly volumeSpark = computed(() =>
    this.sortedPoints().map((p) => p.totalTickets),
  );
  readonly resolvedSpark = computed(() =>
    this.sortedPoints().map((p) => p.resolvedTickets),
  );

  readonly trendTotals = computed(() =>
    this.trendPoints().reduce(
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
    const t = this.trendTotals();
    return t.resolved + t.closed - t.raised;
  });

  // ---------------------------------------------------------------------
  // Derived from the tickets list
  // ---------------------------------------------------------------------

  private readonly openTickets = computed(() =>
    this.allTickets().filter(
      (t) =>
        t.status !== TicketStatus.Resolved && t.status !== TicketStatus.Closed,
    ),
  );

  readonly unassignedOpen = computed(
    () => this.openTickets().filter((t) => !t.assignedAgentId).length,
  );

  readonly criticalOpen = computed(
    () =>
      this.openTickets().filter((t) => t.priority === TicketPriority.Critical)
        .length,
  );

  private readonly attentionAll = computed(() =>
    this.openTickets()
      .filter((t) => t.priority >= TicketPriority.High)
      .sort(
        (a, b) =>
          b.priority - a.priority ||
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
  );

  readonly attentionTotal = computed(() => this.attentionAll().length);

  readonly attention = computed(() =>
    this.attentionAll()
      .slice(0, 5)
      .map((t) => ({ ticket: t, age: this.ageOf(t.createdAt) })),
  );

  readonly recentTickets = computed(() =>
    [...this.allTickets()]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 6),
  );

  /** One plain-language sentence that summarises the page. */
  readonly heroInsight = computed(() => {
    const data = this.metrics();
    if (!data) return '';
    if (!this.hasAnyTickets()) {
      return 'No tickets in this period yet. Once work comes in, it is summarised here.';
    }

    const active = this.activeTickets();
    let text = `${active} ${active === 1 ? 'ticket is' : 'tickets are'} in play`;
    if (this.ticketsLoaded() && this.unassignedOpen() > 0) {
      text += `, and ${this.unassignedOpen()} still ${this.unassignedOpen() === 1 ? 'has' : 'have'} no agent`;
    }
    text += '.';

    if (this.trendPoints().length > 0) {
      const t = this.trendTotals();
      text += ` In this period ${t.raised} were raised and ${t.resolved + t.closed} finished.`;
    }
    return text;
  });

  // ---------------------------------------------------------------------
  // Teams / agents / categories
  // ---------------------------------------------------------------------

  readonly breakdownRows = computed<BreakdownRow[]>(() => {
    switch (this.breakdownTab()) {
      case 'teams':
        return this.shape(
          this.teams().map((t) => ({
            id: t.teamId,
            name: t.teamName,
            sub: `${t.memberCount} ${t.memberCount === 1 ? 'member' : 'members'}`,
            total: t.totalTickets,
            active: t.activeTickets,
            resolved: t.resolvedTickets,
            closed: t.closedTickets,
          })),
        );
      case 'agents':
        return this.shape(
          this.agents().map((a) => ({
            id: a.agentId,
            name: a.agentUserName,
            sub: `${a.activeTickets} active`,
            total: a.assignedTickets,
            active: a.activeTickets,
            resolved: a.resolvedTickets,
            closed: a.closedTickets,
          })),
        );
      case 'categories':
        return this.shape(
          this.categories().map((c) => ({
            id: c.categoryId,
            name: c.categoryName,
            sub: `${c.activeTickets} active`,
            total: c.totalTickets,
            active: c.activeTickets,
            resolved: c.resolvedTickets,
            closed: c.closedTickets,
          })),
        );
    }
  });

  readonly breakdownState = computed(() => this.stateFor(this.breakdownTab()));

  readonly breakdownLink = computed(
    () => `/app/reports/${this.breakdownTab()}`,
  );

  // ---------------------------------------------------------------------
  // Lifecycle and actions
  // ---------------------------------------------------------------------

  ngOnInit(): void {
    this.fetchAnalyticsData();
    this.fetchRecentTickets();
  }

  /** Re-fetches everything that depends on the date range. */
  fetchAnalyticsData(): void {
    const filters = this.range();

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.load(
      'overview',
      this.reportingService.getDashboardOverview(filters),
      (data) => this.metrics.set(data),
      { loading: this.isLoading, error: this.errorMessage },
    );

    this.load(
      'trend',
      this.reportingService.getTicketTimeSeries(filters),
      (rows) => this.trendPoints.set(rows ?? []),
      this.trend,
    );
    this.fetchBreakdowns();
  }

  fetchBreakdowns(): void {
    const filters = this.range();

    this.load(
      'teams',
      this.reportingService.getTeamStatistics(filters),
      (rows) => this.teams.set(rows ?? []),
      this.teamsState,
    );
    this.load(
      'agents',
      this.reportingService.getAgentStatistics(filters),
      (rows) => this.agents.set(rows ?? []),
      this.agentsState,
    );
    this.load(
      'categories',
      this.reportingService.getCategoryStatistics(filters),
      (rows) => this.categories.set(rows ?? []),
      this.categoriesState,
    );
  }

  fetchRecentTickets(): void {
    this.isLoadingRecent.set(true);

    // A failure here must not take the dashboard down: the two panels fed
    // by this call simply render their empty states.
    this.load(
      'tickets',
      this.ticketService.getTickets(),
      (tickets) => {
        this.allTickets.set(tickets ?? []);
        this.ticketsLoaded.set(true);
      },
      { loading: this.isLoadingRecent, error: signal<string | null>(null) },
    );
  }

  onRangeChange(range: ReportDateRangeRequest): void {
    this.range.set(range);
    this.fetchAnalyticsData();
  }

  refresh(): void {
    this.fetchAnalyticsData();
    this.fetchRecentTickets();
  }

  selectTab(tab: BreakdownTab): void {
    this.breakdownTab.set(tab);
  }

  /** Arrow-key navigation for the tab strip (roving tabindex). */
  onTabKeydown(event: KeyboardEvent): void {
    const order: BreakdownTab[] = ['teams', 'agents', 'categories'];
    const i = order.indexOf(this.breakdownTab());
    let next = i;

    if (event.key === 'ArrowRight') next = (i + 1) % order.length;
    else if (event.key === 'ArrowLeft')
      next = (i - 1 + order.length) % order.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = order.length - 1;
    else return;

    event.preventDefault();
    this.breakdownTab.set(order[next]);

    const list = event.currentTarget as HTMLElement;
    setTimeout(() =>
      list
        .querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
        ?.focus(),
    );
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------

  private widget(): WidgetState {
    return { loading: signal(false), error: signal<string | null>(null) };
  }

  private stateFor(tab: BreakdownTab): WidgetState {
    return {
      teams: this.teamsState,
      agents: this.agentsState,
      categories: this.categoriesState,
    }[tab];
  }

  /**
   * Subscribes to a source while keeping its loading and error flags honest.
   * A newer request for the same key cancels the older one, so a slow
   * response to a previous date range can never overwrite a fresher one.
   */
  private load<T>(
    key: string,
    source$: Observable<T>,
    onNext: (value: T) => void,
    state: WidgetState,
  ): void {
    this.inflight.get(key)?.unsubscribe();
    state.loading.set(true);
    state.error.set(null);

    const sub = source$.subscribe({
      next: (value) => {
        onNext(value);
        state.loading.set(false);
      },
      error: (err: Error) => {
        state.error.set(err?.message ?? 'Something went wrong.');
        state.loading.set(false);
      },
    });

    this.inflight.set(key, sub);
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private shape(
    rows: Omit<BreakdownRow, 'activePct' | 'resolvedPct' | 'closedPct'>[],
  ): BreakdownRow[] {
    const top = [...rows]
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
      .slice(0, BREAKDOWN_LIMIT);
    const peak = Math.max(1, ...top.map((r) => r.total));

    return top.map((r) => ({
      ...r,
      activePct: (r.active / peak) * 100,
      resolvedPct: (r.resolved / peak) * 100,
      closedPct: (r.closed / peak) * 100,
    }));
  }

  private ageOf(iso: string): string {
    const minutes = Math.max(
      0,
      Math.floor((Date.now() - new Date(iso).getTime()) / 60000),
    );
    if (minutes < 60) return `${Math.max(1, minutes)}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }
}
