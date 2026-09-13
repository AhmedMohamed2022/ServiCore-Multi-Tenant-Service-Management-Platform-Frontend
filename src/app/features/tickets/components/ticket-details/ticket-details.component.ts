import { Component, inject, OnInit, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { TicketService } from '../../../../core/services/ticket.service';
import { TeamService } from '../../../../core/services/team.service';
import { TicketDto } from '../../models/ticket.model';
import { TeamMemberDto } from '../../../management/models/team.model';
import {
  TicketStatus,
  TicketPriority,
  TicketStatusLabels,
  TicketPriorityLabels,
} from '../../models/ticket-enums.model';
import { TicketCommentsComponent } from '../ticket-comments/ticket-comments.component';

@Component({
  selector: 'app-ticket-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    TicketCommentsComponent,
  ],
  templateUrl: './ticket-details.component.html',
  styleUrls: ['./ticket-details.component.css'],
})
export class TicketDetailsComponent implements OnInit {
  // Bound cleanly via withComponentInputBinding() matching the ':id' param string
  @Input() id!: string;

  private readonly ticketService = inject(TicketService);
  private readonly teamService = inject(TeamService);
  private readonly router = inject(Router);

  // Structural State Signals
  readonly ticket = signal<TicketDto | null>(null);
  readonly availableAgents = signal<TeamMemberDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isActionLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Safe UI Context Flags
  readonly isCustomerPortal = signal<boolean>(false);

  protected readonly statusLabels = TicketStatusLabels;
  protected readonly priorityLabels = TicketPriorityLabels;
  protected readonly ticketStatusEnum = TicketStatus;

  ngOnInit(): void {
    // Discern url segment origins before pulling database variables
    this.isCustomerPortal.set(this.router.url.includes('/portal/'));
    this.loadTicketContext();
  }

  loadTicketContext(): void {
    if (!this.id) {
      this.errorMessage.set(
        'Missing expected ticket unique tracking token parameter reference.',
      );
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.ticketService.getTicketById(this.id).subscribe({
      next: (ticketData) => {
        this.ticket.set(ticketData);
        this.isLoading.set(false);

        // Safeguard roster querying: Customers must never download staff lists
        if (!this.isCustomerPortal()) {
          this.loadAvailableStaffPool();
        }
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  loadAvailableStaffPool(): void {
    this.teamService.getTeams().subscribe({
      next: (teams) => {
        // Fixed: Safely check for array entries and read the index [0] id property
        if (teams && teams.length > 0) {
          this.teamService.getTeamMembers(teams[0].id).subscribe((members) => {
            this.availableAgents.set(members);
          });
        }
      },
    });
  }

  executeWorkflowTransition(
    action: 'open' | 'start' | 'wait' | 'resolve' | 'close',
  ): void {
    this.isActionLoading.set(true);
    this.errorMessage.set(null);

    let stream$: Observable<void>;
    switch (action) {
      case 'open':
        stream$ = this.ticketService.openTicket(this.id);
        break;
      case 'start':
        stream$ = this.ticketService.startTicket(this.id);
        break;
      case 'wait':
        stream$ = this.ticketService.waitForCustomer(this.id);
        break;
      case 'resolve':
        stream$ = this.ticketService.resolveTicket(this.id);
        break;
      case 'close':
        stream$ = this.ticketService.closeTicket(this.id);
        break;
    }

    stream$.subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.loadTicketContext();
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isActionLoading.set(false);
      },
    });
  }

  onAssignAgent(event: Event): void {
    const agentId = (event.target as HTMLSelectElement).value;
    this.isActionLoading.set(true);
    this.errorMessage.set(null);

    if (!agentId) {
      this.ticketService.unassignTicket(this.id).subscribe({
        next: () => {
          this.isActionLoading.set(false);
          this.loadTicketContext();
        },
        error: (err: Error) => {
          this.errorMessage.set(err.message);
          this.isActionLoading.set(false);
        },
      });
    } else {
      this.ticketService.assignTicket(this.id, agentId).subscribe({
        next: () => {
          this.isActionLoading.set(false);
          this.loadTicketContext();
        },
        error: (err: Error) => {
          this.errorMessage.set(err.message);
          this.isActionLoading.set(false);
        },
      });
    }
  }
}
