import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TicketService } from '../../../../core/services/ticket.service';
import { TicketDto } from '../../../tickets/models/ticket.model';
import {
  TicketStatusLabels,
  TicketPriorityLabels,
} from '../../../tickets/models/ticket-enums.model';

@Component({
  selector: 'app-portal-ticket-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './portal-ticket-list.component.html',
  styleUrls: ['./portal-ticket-list.component.css'],
})
export class PortalTicketListComponent implements OnInit {
  private readonly ticketService = inject(TicketService);

  protected readonly statusLabels = TicketStatusLabels;
  protected readonly priorityLabels = TicketPriorityLabels;

  readonly customerTickets = signal<TicketDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCustomerTickets();
  }

  loadCustomerTickets(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.ticketService.getTickets().subscribe({
      next: (data) => {
        this.customerTickets.set(data);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }
}
