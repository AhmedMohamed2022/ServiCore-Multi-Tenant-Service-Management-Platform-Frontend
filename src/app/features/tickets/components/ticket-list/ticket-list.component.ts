import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { TicketService } from '../../../../core/services/ticket.service';
import { TeamService } from '../../../../core/services/team.service';
import { CategoryService } from '../../../../core/services/category.service';
import { CustomerService } from '../../../../core/services/customer.service';
import { AgentDirectoryService } from '../../../../core/services/agent-directory.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { TicketDto } from '../../models/ticket.model';
import {
  TICKET_PRIORITY_ORDER,
  TICKET_STATUS_ORDER,
  TicketPriority,
  TicketPriorityLabels,
  TicketStatus,
  TicketStatusLabels,
  isActiveStatus,
} from '../../models/ticket-enums.model';
import { relativeTime } from '../../utils/ticket-time';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import {
  AlertComponent,
  EmptyStateComponent,
} from '../../../../shared/ui/states/states.component';
import {
  TicketPriorityBadgeComponent,
  TicketStatusBadgeComponent,
} from '../../../../shared/ticket/ticket-badges.component';
import { CountUpDirective } from '../../../dashboard/widgets/directives/count-up.directive';

type StatusFilter = 'ALL' | 'ACTIVE' | TicketStatus;
type AssignmentFilter = 'ALL' | 'UNASSIGNED' | 'MINE' | 'NO_AGENT';
type SortKey = 'created' | 'updated' | 'priority' | 'status' | 'title';
type QueueView = 'all' | 'active' | 'triage' | 'critical';
type Density = 'comfortable' | 'compact';

/** The direction each sort key starts in; header clicks flip it. */
const SORT_DEFAULT_DESC: Record<SortKey, boolean> = {
  created: true,
  updated: true,
  priority: true,
  status: false,
  title: false,
};

/** Status colour dots on the filter chips: the same data-viz tokens as charts. */
const STATUS_DOT: Record<number, string> = {
  [TicketStatus.New]: 'bg-status-new',
  [TicketStatus.Open]: 'bg-status-open',
  [TicketStatus.InProgress]: 'bg-status-progress',
  [TicketStatus.WaitingForCustomer]: 'bg-status-waiting',
  [TicketStatus.Resolved]: 'bg-status-resolved',
  [TicketStatus.Closed]: 'bg-status-closed',
};

interface StatusChip {
  readonly key: StatusFilter;
  readonly label: string;
  readonly count: number;
  readonly dot: string;
}

/** Everything one table row or mobile card needs, resolved once per change. */
export interface TicketRow {
  readonly ticket: TicketDto;
  readonly shortId: string;
  readonly customer: string;
  readonly category: string;
  readonly team: string;
  /** Empty when nobody is assigned. */
  readonly assignee: string;
  /** Why an unassigned ticket is unassigned: no team yet, or no agent yet. */
  readonly pending: 'triage' | 'agent' | null;
  readonly updated: string;
  readonly opened: string;
}

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatMenuModule,
    MatTooltipModule,
    PageHeaderComponent,
    IconComponent,
    AvatarComponent,
    AlertComponent,
    EmptyStateComponent,
    TicketStatusBadgeComponent,
    TicketPriorityBadgeComponent,
    CountUpDirective,
  ],
  templateUrl: './ticket-list.component.html',
  styleUrls: ['./ticket-list.component.css'],
})
export class TicketListComponent implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly teamService = inject(TeamService);
  private readonly categoryService = inject(CategoryService);
  private readonly customerService = inject(CustomerService);
  private readonly agentDirectory = inject(AgentDirectoryService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statusLabels = TicketStatusLabels;
  protected readonly priorityLabels = TicketPriorityLabels;
  protected readonly statusOrder = TICKET_STATUS_ORDER;
  protected readonly priorityOrder = TICKET_PRIORITY_ORDER;
  protected readonly TicketStatus = TicketStatus;
  protected readonly pageSizes = [25, 50, 100];
  protected readonly skeletonRows = [0, 1, 2, 3, 4, 5, 6, 7];

  // --- Data -------------------------------------------------------------
  readonly allTickets = signal<TicketDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  /**
   * TicketDto is ids only — it carries teamId, customerId, categoryId and
   * assignedAgentId but no names for any of them. These lookups supply the
   * display text for those columns. Each lookup fails independently and
   * degrades to a blank cell rather than failing the page.
   */
  readonly teamNames = signal<Map<string, string>>(new Map());
  readonly customerNames = signal<Map<string, string>>(new Map());
  readonly categoryNames = signal<Map<string, string>>(new Map());

  /** Ticks once a minute so "3m ago" does not go stale on a long-lived tab. */
  private readonly now = signal<number>(Date.now());

  // --- Filters ----------------------------------------------------------
  readonly searchTerm = signal<string>('');
  readonly statusFilter = signal<StatusFilter>('ALL');
  readonly priorityFilter = signal<TicketPriority | 'ALL'>('ALL');
  readonly assignmentFilter = signal<AssignmentFilter>('ALL');
  readonly sortKey = signal<SortKey>('created');
  /** True when the user has flipped the key's default direction. */
  readonly sortReversed = signal<boolean>(false);
  readonly density = signal<Density>('comfortable');

  readonly pageSize = signal<number>(25);
  readonly pageIndex = signal<number>(0);

  private readonly currentUserId = computed(
    () => this.authService.currentUser()?.userId ?? null,
  );

  /** Gives the viewer's own avatar the same initials as the top bar. */
  protected readonly myEmail = computed(
    () => this.authService.currentUser()?.email ?? 'You',
  );

  // --- Counts -----------------------------------------------------------
  readonly totalCount = computed(() => this.allTickets().length);

  readonly activeCount = computed(
    () => this.allTickets().filter((t) => isActiveStatus(t.status)).length,
  );

  readonly unassignedCount = computed(
    () => this.allTickets().filter((t) => !t.teamId).length,
  );

  readonly criticalCount = computed(
    () =>
      this.allTickets().filter(
        (t) =>
          t.priority === TicketPriority.Critical && isActiveStatus(t.status),
      ).length,
  );

  readonly waitingCount = computed(
    () =>
      this.allTickets().filter(
        (t) => t.status === TicketStatus.WaitingForCustomer,
      ).length,
  );

  readonly finishedCount = computed(
    () =>
      this.allTickets().filter(
        (t) =>
          t.status === TicketStatus.Resolved ||
          t.status === TicketStatus.Closed,
      ).length,
  );

  /** Active tickets that have a team but are still waiting for an agent. */
  readonly needsAgentCount = computed(
    () =>
      this.allTickets().filter(
        (t) => isActiveStatus(t.status) && !!t.teamId && !t.assignedAgentId,
      ).length,
  );

  readonly criticalUnassignedCount = computed(
    () =>
      this.allTickets().filter(
        (t) =>
          t.priority === TicketPriority.Critical &&
          isActiveStatus(t.status) &&
          !t.assignedAgentId,
      ).length,
  );

  readonly mineCount = computed(() => {
    const me = this.currentUserId();
    if (!me) return 0;
    return this.allTickets().filter((t) => t.assignedAgentId === me).length;
  });

  readonly statusCounts = computed(() => {
    const counts = new Map<TicketStatus, number>();
    for (const ticket of this.allTickets()) {
      counts.set(ticket.status, (counts.get(ticket.status) ?? 0) + 1);
    }
    return counts;
  });

  /** One chip per status, in workflow order, each with its live count. */
  readonly statusChips = computed<StatusChip[]>(() => {
    const counts = this.statusCounts();
    return [
      { key: 'ALL', label: 'All', count: this.totalCount(), dot: '' },
      { key: 'ACTIVE', label: 'Active', count: this.activeCount(), dot: '' },
      ...this.statusOrder.map((status) => ({
        key: status as StatusFilter,
        label: TicketStatusLabels[status],
        count: counts.get(status) ?? 0,
        dot: STATUS_DOT[status],
      })),
    ];
  });

  // --- Filtering and sorting -------------------------------------------
  readonly filteredTickets = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const priority = this.priorityFilter();
    const assignment = this.assignmentFilter();
    const me = this.currentUserId();

    let rows = this.allTickets();

    if (status === 'ACTIVE') {
      rows = rows.filter((t) => isActiveStatus(t.status));
    } else if (status !== 'ALL') {
      rows = rows.filter((t) => t.status === status);
    }

    if (priority !== 'ALL') {
      rows = rows.filter((t) => t.priority === priority);
    }

    if (assignment === 'UNASSIGNED') {
      rows = rows.filter((t) => !t.teamId);
    } else if (assignment === 'MINE') {
      rows = rows.filter((t) => !!me && t.assignedAgentId === me);
    } else if (assignment === 'NO_AGENT') {
      rows = rows.filter(
        (t) => isActiveStatus(t.status) && !!t.teamId && !t.assignedAgentId,
      );
    }

    if (term) {
      rows = rows.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          this.customerNameFor(t).toLowerCase().includes(term) ||
          this.categoryNameFor(t).toLowerCase().includes(term) ||
          this.teamNameFor(t).toLowerCase().includes(term) ||
          this.assigneeNameFor(t).toLowerCase().includes(term) ||
          t.id.toLowerCase().startsWith(term),
      );
    }

    return this.sortRows(rows);
  });

  readonly pagedTickets = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredTickets().slice(start, start + this.pageSize());
  });

  /** The visible page, with every lookup already resolved. */
  readonly rows = computed<TicketRow[]>(() => {
    const now = this.now();
    return this.pagedTickets().map((ticket) => {
      const assignee = this.assigneeNameFor(ticket);
      return {
        ticket,
        shortId: ticket.id.substring(0, 8),
        customer: this.customerNameFor(ticket),
        category: this.categoryNameFor(ticket),
        team: this.teamNameFor(ticket),
        assignee,
        pending:
          assignee || !isActiveStatus(ticket.status)
            ? null
            : ticket.teamId
              ? 'agent'
              : 'triage',
        updated: relativeTime(ticket.updatedAt, now),
        opened: relativeTime(ticket.createdAt, now),
      };
    });
  });

  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filteredTickets().length / this.pageSize())),
  );

  readonly rangeStart = computed(() =>
    this.filteredTickets().length === 0
      ? 0
      : this.pageIndex() * this.pageSize() + 1,
  );

  readonly rangeEnd = computed(
    () => this.pageIndex() * this.pageSize() + this.pagedTickets().length,
  );

  readonly hasActiveFilters = computed(
    () =>
      this.statusFilter() !== 'ALL' ||
      this.priorityFilter() !== 'ALL' ||
      this.assignmentFilter() !== 'ALL' ||
      this.searchTerm().trim().length > 0,
  );

  /**
   * Which of the four summary tiles the current filters correspond to
   * exactly (search aside), so a tile only reads as pressed when pressing it
   * would not change anything.
   */
  readonly activeView = computed<QueueView | null>(() => {
    const status = this.statusFilter();
    const priority = this.priorityFilter();
    const assignment = this.assignmentFilter();

    if (status === 'ALL' && priority === 'ALL' && assignment === 'ALL') {
      return 'all';
    }
    if (status === 'ACTIVE' && priority === 'ALL' && assignment === 'ALL') {
      return 'active';
    }
    if (status === 'ALL' && priority === 'ALL' && assignment === 'UNASSIGNED') {
      return 'triage';
    }
    if (
      status === 'ACTIVE' &&
      priority === TicketPriority.Critical &&
      assignment === 'ALL'
    ) {
      return 'critical';
    }
    return null;
  });

  /** First load only: later refreshes keep the rows on screen. */
  readonly isInitialLoad = computed(
    () => this.isLoading() && this.allTickets().length === 0,
  );

  constructor() {
    // Any filter change invalidates the current page offset.
    effect(() => {
      this.searchTerm();
      this.statusFilter();
      this.priorityFilter();
      this.assignmentFilter();
      this.pageIndex.set(0);
    });

    const tick = setInterval(() => this.now.set(Date.now()), 60_000);
    this.destroyRef.onDestroy(() => clearInterval(tick));
  }

  ngOnInit(): void {
    this.loadTicketWorkspace();
    this.loadLookups();
  }

  loadTicketWorkspace(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.ticketService.getTickets().subscribe({
      next: (tickets) => {
        this.allTickets.set(tickets);
        this.isLoading.set(false);
        this.now.set(Date.now());
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  private loadLookups(): void {
    // Agent names come from the one endpoint in the API that maps an Identity
    // user id to a name; it is Manager-gated, so this is a no-op for Agents
    // and the assignee column falls back to an abbreviated id.
    this.agentDirectory.loadIfPermitted();

    forkJoin({
      teams: this.teamService.getTeams().pipe(catchError(() => of([]))),
      categories: this.categoryService
        .getCategories()
        .pipe(catchError(() => of([]))),
      customers: this.customerService
        .getCustomers()
        .pipe(catchError(() => of([]))),
    }).subscribe(({ teams, categories, customers }) => {
      this.teamNames.set(new Map(teams.map((team) => [team.id, team.name])));
      this.categoryNames.set(
        new Map(categories.map((category) => [category.id, category.name])),
      );
      this.customerNames.set(
        new Map(customers.map((customer) => [customer.id, customer.name])),
      );
    });
  }

  teamNameFor(ticket: TicketDto): string {
    if (!ticket.teamId) return '';
    return this.teamNames().get(ticket.teamId) ?? '';
  }

  customerNameFor(ticket: TicketDto): string {
    return this.customerNames().get(ticket.customerId) ?? '';
  }

  categoryNameFor(ticket: TicketDto): string {
    return this.categoryNames().get(ticket.categoryId) ?? '';
  }

  assigneeNameFor(ticket: TicketDto): string {
    if (!ticket.assignedAgentId) return '';
    if (ticket.assignedAgentId === this.currentUserId()) return 'You';
    return this.agentDirectory.labelFor(ticket.assignedAgentId, 'Agent');
  }

  // --- Filter actions ---------------------------------------------------
  setStatusFilter(status: StatusFilter): void {
    this.statusFilter.set(status);
  }

  setPriorityFilter(priority: TicketPriority | 'ALL'): void {
    this.priorityFilter.set(priority);
  }

  setAssignmentFilter(value: AssignmentFilter): void {
    this.assignmentFilter.set(value);
  }

  /**
   * Summary tiles are saved views: each sets the status, priority and
   * assignment filters together (the search box is left alone). Pressing the
   * tile that is already active returns to the full queue.
   */
  setView(view: QueueView): void {
    const target = this.activeView() === view ? 'all' : view;

    this.statusFilter.set(
      target === 'active' || target === 'critical' ? 'ACTIVE' : 'ALL',
    );
    this.priorityFilter.set(
      target === 'critical' ? TicketPriority.Critical : 'ALL',
    );
    this.assignmentFilter.set(target === 'triage' ? 'UNASSIGNED' : 'ALL');
  }

  isStatusChipActive(key: StatusFilter): boolean {
    return this.statusFilter() === key;
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('ALL');
    this.priorityFilter.set('ALL');
    this.assignmentFilter.set('ALL');
  }

  // --- Sorting ----------------------------------------------------------
  /** From the sort menu: pick a key in its natural direction. */
  setSort(key: SortKey): void {
    this.sortKey.set(key);
    this.sortReversed.set(false);
    this.pageIndex.set(0);
  }

  /** From a column header: same key flips direction, a new key starts fresh. */
  toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortReversed.update((reversed) => !reversed);
    } else {
      this.sortKey.set(key);
      this.sortReversed.set(false);
    }
    this.pageIndex.set(0);
  }

  toggleSortDirection(): void {
    this.sortReversed.update((reversed) => !reversed);
    this.pageIndex.set(0);
  }

  /** aria-sort value for a header, or null when the column is not sorted. */
  ariaSort(key: SortKey): 'ascending' | 'descending' | null {
    if (this.sortKey() !== key) return null;
    const descending = SORT_DEFAULT_DESC[key] !== this.sortReversed();
    return descending ? 'descending' : 'ascending';
  }

  /** Arrow for the sorted column; a quiet two-way glyph for the others. */
  protected sortIcon(key: SortKey): string {
    const direction = this.ariaSort(key);
    if (!direction) return 'unfold_more';
    return direction === 'descending' ? 'arrow_downward' : 'arrow_upward';
  }

  protected sortLabel(): string {
    const labels: Record<SortKey, string> = {
      created: 'date opened',
      updated: 'last update',
      priority: 'priority',
      status: 'workflow order',
      title: 'title',
    };
    return labels[this.sortKey()];
  }

  // --- Paging and layout ------------------------------------------------
  goToPage(index: number): void {
    this.pageIndex.set(Math.min(Math.max(0, index), this.pageCount() - 1));
  }

  setPageSize(size: number): void {
    this.pageSize.set(Number(size) || 25);
    this.pageIndex.set(0);
  }

  toggleDensity(): void {
    this.density.update((d) =>
      d === 'comfortable' ? 'compact' : 'comfortable',
    );
  }

  /**
   * Up/Down/Home/End move focus between rows while a row link has focus, so
   * a long queue can be walked from the keyboard. Enter on the focused link
   * opens the ticket as usual.
   */
  onRowKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.hasAttribute('data-row-link')) return;

    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) return;

    const links = Array.from(
      (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
        '[data-row-link]',
      ),
    );
    const index = links.indexOf(target);
    if (index === -1) return;

    const next =
      event.key === 'ArrowDown'
        ? index + 1
        : event.key === 'ArrowUp'
          ? index - 1
          : event.key === 'Home'
            ? 0
            : links.length - 1;

    const destination = links[Math.min(Math.max(0, next), links.length - 1)];
    if (destination) {
      event.preventDefault();
      destination.focus();
    }
  }

  private sortRows(rows: TicketDto[]): TicketDto[] {
    const sorted = [...rows];
    const byNewest = (a: TicketDto, b: TicketDto) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

    switch (this.sortKey()) {
      case 'priority':
        // Critical first — that is the order an operator wants to triage in.
        sorted.sort((a, b) => b.priority - a.priority || byNewest(a, b));
        break;
      case 'status':
        sorted.sort((a, b) => a.status - b.status || byNewest(a, b));
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'updated':
        sorted.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        break;
      case 'created':
      default:
        sorted.sort(byNewest);
        break;
    }

    return this.sortReversed() ? sorted.reverse() : sorted;
  }
}
