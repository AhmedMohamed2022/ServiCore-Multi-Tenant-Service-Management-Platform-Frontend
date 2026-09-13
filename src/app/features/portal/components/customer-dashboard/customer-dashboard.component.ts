import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CustomerTicketService,
  CustomerTicketDto,
} from '../../../../core/services/customer-ticket.service';
import {
  TicketPriorityLabels,
  TicketStatusLabels,
} from '../../../tickets/models/ticket-enums.model';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customer-dashboard.component.html',
  styleUrls: ['./customer-dashboard.component.css'],
})
export class CustomerDashboardComponent implements OnInit {
  private readonly portalService = inject(CustomerTicketService);

  readonly tickets = signal<CustomerTicketDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMsg = signal<string | null>(null);

  protected readonly statusLabels = TicketStatusLabels;
  protected readonly priorityLabels = TicketPriorityLabels;

  ngOnInit(): void {
    this.fetchCustomerTickets();
  }

  fetchCustomerTickets(): void {
    this.isLoading.set(true);
    this.errorMsg.set(null);

    this.portalService.getMyTickets().subscribe({
      next: (data) => {
        this.tickets.set(data);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMsg.set(`Failed to retrieve your tickets: ${err.message}`);
        this.isLoading.set(false);
      },
    });
  }
}
