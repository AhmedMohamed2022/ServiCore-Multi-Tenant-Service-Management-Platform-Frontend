import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
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

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import {
  AlertComponent,
  EmptyStateComponent,
  LoadingStateComponent,
} from '../../../../shared/ui/states/states.component';
import {
  TicketPriorityBadgeComponent,
  TicketStatusBadgeComponent,
} from '../../../../shared/ticket/ticket-badges.component';

type StatusFilter = 'ALL' | 'ACTIVE' | TicketStatus;
type SortKey = 'created' | 'priority' | 'status' | 'title';

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
    LoadingStateComponent,
    TicketStatusBadgeComponent,
    TicketPriorityBadgeComponent,
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

  protected readonly statusLabels = TicketStatusLabels;
  protected readonly priorityLabels = TicketPriorityLabels;
  protected readonly statusOrder = TICKET_STATUS_ORDER;
  protected readonly priorityOrder = TICKET_PRIORITY_ORDER;
  protected readonly TicketStatus = TicketStatus;

  // --- Data -------------------------------------------------------------
  readonly allTickets = signal<TicketDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  /**
   * TicketDto is ids only — it carries teamId, customerId, categoryId and
   * assignedAgentId but no names for any of them. These lookups supply the
   * display text for those columns.
   *
   * Until now the templates read `ticket.customerName`, `ticket.categoryName`
   * and `ticket.assignedAgentName`, none of which the server has ever sent, so
   * Customer and Category permanently rendered an em dash and every assigned
   * ticket looked unassigned. Search matched on those same phantom fields, so
   * searching by customer or agent silently matched nothing.
   *
   * Each lookup fails independently and degrades to a blank cell rather than
   * failing the page.
   */
  readonly teamNames = signal<Map<string, string>>(new Map());
  readonly customerNames = signal<Map<string, string>>(new Map());
  readonly categoryNames = signal<Map<string, string>>(new Map());

  // --- Filters ----------------------------------------------------------
  readonly searchTerm = signal<string>('');
  readonly statusFilter = signal<StatusFilter>('ALL');
  readonly priorityFilter = signal<TicketPriority | 'ALL'>('ALL');
  readonly assignmentFilter = signal<'ALL' | 'UNASSIGNED'>('ALL');
  readonly sortKey = signal<SortKey>('created');

  readonly pageSize = signal<number>(25);
  readonly pageIndex = signal<number>(0);

  // --- Counts -----------------------------------------------------------
  // Previously these filtered on literal strings ('0', '2', '3', '4') that did
  // not line up with TicketStatus at all — "New" matched nothing and
  // "In Progress" silently returned Open tickets. Every count and filter now
  // goes through the enum.
  readonly totalCount = computed(() => this.allTickets().length);

  readonly activeCount = computed(
    () => this.allTickets().filter((t) => isActiveStatus(t.status)).length,
  );

  readonly unassignedCount = computed(
    () => this.allTickets().filter((t) => !t.assignedAgentId).length,
  );

  readonly criticalCount = computed(
    () =>
      this.allTickets().filter(
        (t) => t.priority === TicketPriority.Critical && isActiveStatus(t.status),
      ).length,
  );

  readonly statusCounts = computed(() => {
    const counts = new Map<TicketStatus, number>();
    for (const ticket of this.allTickets()) {
      counts.set(ticket.status, (counts.get(ticket.status) ?? 0) + 1);
    }
    return counts;
  });

  // --- Filtering and sorting -------------------------------------------
  readonly filteredTickets = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const priority = this.priorityFilter();
    const assignment = this.assignmentFilter();

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
      rows = rows.filter((t) => !t.assignedAgentId);
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

  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filteredTickets().length / this.pageSize())),
  );

  readonly hasActiveFilters = computed(
    () =>
      this.statusFilter() !== 'ALL' ||
      this.priorityFilter() !== 'ALL' ||
      this.assignmentFilter() !== 'ALL' ||
      this.searchTerm().trim().length > 0,
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
    return this.agentDirectory.labelFor(ticket.assignedAgentId, 'Agent');
  }

  setStatusFilter(status: StatusFilter): void {
    this.statusFilter.set(status);
  }

  setPriorityFilter(priority: TicketPriority | 'ALL'): void {
    this.priorityFilter.set(priority);
  }

  setAssignmentFilter(value: 'ALL' | 'UNASSIGNED'): void {
    this.assignmentFilter.set(value);
  }

  setSort(key: SortKey): void {
    this.sortKey.set(key);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('ALL');
    this.priorityFilter.set('ALL');
    this.assignmentFilter.set('ALL');
  }

  goToPage(index: number): void {
    this.pageIndex.set(Math.min(Math.max(0, index), this.pageCount() - 1));
  }

  private sortRows(rows: TicketDto[]): TicketDto[] {
    const sorted = [...rows];

    switch (this.sortKey()) {
      case 'priority':
        // Critical first — that is the order an operator wants to triage in.
        return sorted.sort(
          (a, b) =>
            b.priority - a.priority ||
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      case 'status':
        return sorted.sort((a, b) => a.status - b.status);
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'created':
      default:
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }
  }
}
