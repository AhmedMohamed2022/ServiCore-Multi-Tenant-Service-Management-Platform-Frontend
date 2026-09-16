import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { TicketService } from '../../../../core/services/ticket.service';
import { CategoryService } from '../../../../core/services/category.service';
import { TicketDto } from '../../../tickets/models/ticket.model';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  AlertComponent,
  EmptyStateComponent,
  LoadingStateComponent,
} from '../../../../shared/ui/states/states.component';
import {
  TicketPriorityBadgeComponent,
  TicketStatusBadgeComponent,
} from '../../../../shared/ticket/ticket-badges.component';
import { catchError, of } from 'rxjs';

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
    LoadingStateComponent,
    TicketStatusBadgeComponent,
    TicketPriorityBadgeComponent,
  ],
  templateUrl: './portal-ticket-list.component.html',
})
export class PortalTicketListComponent implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly categoryService = inject(CategoryService);

  readonly tickets = signal<TicketDto[]>([]);
  readonly categoryNames = signal<Map<string, string>>(new Map());
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  /**
   * Defect: this view used to colour the status chip with
   * `ticket.status === 4`, which is `WaitingForCustomer` under the real
   * enum, and label it "resolved" styling — the same class of enum-literal
   * bug the ticket list filter had (see Batch 2's defect #1). A ticket
   * genuinely waiting on the customer's own reply was shown in the same
   * green as a finished one. `sc-ticket-status-badge` reads the enum
   * directly and can't drift from it the way a hardcoded number can.
   */
  readonly sortedTickets = computed(() =>
    [...this.tickets()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  );

  ngOnInit(): void {
    this.loadCustomerTickets();
  }

  loadCustomerTickets(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.ticketService.getTickets().subscribe({
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
   * column can show a name instead of a raw id.
   */
  private loadCategoryNames(tickets: TicketDto[]): void {
    if (tickets.length === 0) return;

    this.categoryService
      .getCategories()
      .pipe(catchError(() => of([])))
      .subscribe((categories) =>
        this.categoryNames.set(
          new Map(categories.map((c) => [c.id, c.name])),
        ),
      );
  }

  categoryNameFor(ticket: TicketDto): string {
    return this.categoryNames().get(ticket.categoryId) ?? '';
  }
}
