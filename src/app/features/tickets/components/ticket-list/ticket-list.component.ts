import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TicketService } from '../../../../core/services/ticket.service';
import { TicketDto } from '../../models/ticket.model';
import {
  TicketStatus,
  TicketPriority,
  TicketStatusLabels,
  TicketPriorityLabels,
} from '../../models/ticket-enums.model';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ticket-list.component.html',
  styleUrls: ['./ticket-list.component.css'],
})
export class TicketListComponent implements OnInit {
  private readonly ticketService = inject(TicketService);

  // Expose structural mapping dictionaries directly to the template view
  protected readonly statusLabels = TicketStatusLabels;
  protected readonly priorityLabels = TicketPriorityLabels;

  // Structural State Signals
  readonly allTickets = signal<TicketDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly statusFilter = signal<string>('ALL');

  // Computed dashboard queue summary metrics
  readonly totalCount = computed(() => this.allTickets().length);
  readonly newCount = computed(
    () => this.allTickets().filter((t) => t.status === TicketStatus.New).length,
  );
  readonly activeCount = computed(
    () =>
      this.allTickets().filter(
        (t) =>
          t.status === TicketStatus.InProgress ||
          t.status === TicketStatus.Open,
      ).length,
  );
  readonly resolvedCount = computed(
    () =>
      this.allTickets().filter((t) => t.status === TicketStatus.Resolved)
        .length,
  );

  // Reactive evaluation filter grid matching selections
  readonly filteredTickets = computed(() => {
    const filter = this.statusFilter();
    if (filter === 'ALL') return this.allTickets();
    const targetStatus = parseInt(filter, 10);
    return this.allTickets().filter((t) => t.status === targetStatus);
  });

  ngOnInit(): void {
    this.loadTicketWorkspace();
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

  setFilter(status: string): void {
    this.statusFilter.set(status);
  }
}
