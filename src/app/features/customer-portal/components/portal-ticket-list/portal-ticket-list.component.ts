import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { CustomerTicketService } from '../../../../core/services/customer-ticket.service';
import { CategoryService } from '../../../../core/services/category.service';
import { TicketDto } from '../../../tickets/models/ticket.model';
import {
  TicketPriorityIcons,
  TicketPriorityLabels,
  TicketPriorityTones,
} from '../../../tickets/models/ticket-enums.model';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  AlertComponent,
  EmptyStateComponent,
} from '../../../../shared/ui/states/states.component';
import {
  PortalStatusView,
  portalStatusView,
  relativeTime,
  stageIndex,
} from '../../utils/portal-view';
import { catchError, of } from 'rxjs';

type TicketFilter = 'all' | 'active' | 'reply' | 'done';
type TicketSort = 'activity' | 'raised';

interface TicketRow {
  ticket: TicketDto;
  shortId: string;
  status: PortalStatusView;
  /** 0..3 — how far along the received → in progress → resolved track it is. */
  stage: number;
  categoryName: string;
  priorityLabel: string;
  priorityTone: string;
  priorityIcon: string;
  updatedAgo: string;
}

const PAGE_SIZE = 15;

/**
 * The customer's home screen. Everything shown is derived from
 * GET /tickets (already scoped to the signed-in customer by the API) plus
 * GET /categories for display names. Categories are best-effort and never
 * block the list.
 */
@Component({
  selector: 'app-portal-ticket-list',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    PageHeaderComponent,
    IconComponent,
    AlertComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portal-ticket-list.component.html',
  styleUrls: ['./portal-ticket-list.component.css'],
})
export class PortalTicketListComponent implements OnInit {
  private readonly ticketService = inject(CustomerTicketService);
  private readonly categoryService = inject(CategoryService);

  readonly tickets = signal<TicketDto[]>([]);
  readonly categoryNames = signal<Map<string, string>>(new Map());
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Local UI state ----------------------------------------------------------
  readonly filter = signal<TicketFilter>('all');
  readonly sort = signal<TicketSort>('activity');
  readonly query = signal<string>('');
  readonly visibleCount = signal<number>(PAGE_SIZE);

  /** Fixed number of skeleton rows, so the loading state never shifts layout. */
  protected readonly skeletonRows = [0, 1, 2, 3];

  /**
   * Defect (kept from the previous build): the status chip used to be coloured
   * from `ticket.status === 4`, which is WaitingForCustomer under the real
   * enum. Status is now always read through portalStatusView, which is keyed
   * on the enum itself and cannot drift from it.
   */
  private readonly rows = computed<TicketRow[]>(() => {
    const names = this.categoryNames();
    return this.tickets().map((ticket) => {
      const status = portalStatusView(ticket.status);
      return {
        ticket,
        shortId: ticket.id.substring(0, 8),
        status,
        stage: stageIndex(status.stage),
        categoryName: names.get(ticket.categoryId) ?? '',
        priorityLabel: TicketPriorityLabels[ticket.priority] ?? '',
        priorityTone: TicketPriorityTones[ticket.priority] ?? 'neutral',
        priorityIcon: TicketPriorityIcons[ticket.priority] ?? 'remove',
        updatedAgo: relativeTime(ticket.updatedAt),
      };
    });
  });

  readonly counts = computed(() => {
    const rows = this.rows();
    return {
      all: rows.length,
      active: rows.filter((r) => r.status.isActive).length,
      reply: rows.filter((r) => r.status.needsReply).length,
      done: rows.filter((r) => !r.status.isActive).length,
    };
  });

  protected readonly filterOptions = computed(() => {
    const c = this.counts();
    return [
      { id: 'all' as TicketFilter, label: 'All', count: c.all },
      { id: 'active' as TicketFilter, label: 'Active', count: c.active },
      {
        id: 'reply' as TicketFilter,
        label: 'Needs your reply',
        count: c.reply,
      },
      { id: 'done' as TicketFilter, label: 'Resolved & closed', count: c.done },
    ];
  });

  readonly filteredRows = computed<TicketRow[]>(() => {
    const filter = this.filter();
    const q = this.query().trim().toLowerCase();
    const sort = this.sort();

    const matched = this.rows().filter((r) => {
      if (filter === 'active' && !r.status.isActive) return false;
      if (filter === 'reply' && !r.status.needsReply) return false;
      if (filter === 'done' && r.status.isActive) return false;
      if (!q) return true;
      return (
        r.ticket.title.toLowerCase().includes(q) ||
        r.categoryName.toLowerCase().includes(q) ||
        r.shortId.toLowerCase().includes(q)
      );
    });

    const key = (r: TicketRow) =>
      new Date(
        sort === 'activity' ? r.ticket.updatedAt : r.ticket.createdAt,
      ).getTime();

    return matched.sort((a, b) => key(b) - key(a));
  });

  readonly visibleRows = computed(() =>
    this.filteredRows().slice(0, this.visibleCount()),
  );

  readonly hasMore = computed(
    () => this.filteredRows().length > this.visibleCount(),
  );

  readonly hasActiveFilters = computed(
    () => this.filter() !== 'all' || this.query().trim().length > 0,
  );

  ngOnInit(): void {
    this.loadCustomerTickets();
  }

  loadCustomerTickets(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.ticketService.getMyTickets().subscribe({
      next: (data) => {
        this.tickets.set(data);
        this.isLoading.set(false);
        this.loadCategoryNames(data);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  /**
   * TicketDto carries categoryId only. GET /categories works for an
   * authenticated customer the same way it does for staff, so the category
   * can show a name instead of a raw id.
   */
  private loadCategoryNames(tickets: TicketDto[]): void {
    if (tickets.length === 0) return;

    this.categoryService
      .getCategories()
      .pipe(catchError(() => of([])))
      .subscribe((categories) =>
        this.categoryNames.set(new Map(categories.map((c) => [c.id, c.name]))),
      );
  }

  categoryNameFor(ticket: TicketDto): string {
    return this.categoryNames().get(ticket.categoryId) ?? '';
  }

  setFilter(filter: TicketFilter): void {
    this.filter.set(filter);
    this.visibleCount.set(PAGE_SIZE);
  }

  setSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as TicketSort);
  }

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.visibleCount.set(PAGE_SIZE);
  }

  clearFilters(): void {
    this.filter.set('all');
    this.query.set('');
    this.visibleCount.set(PAGE_SIZE);
  }

  showMore(): void {
    this.visibleCount.update((n) => n + PAGE_SIZE);
  }
}
