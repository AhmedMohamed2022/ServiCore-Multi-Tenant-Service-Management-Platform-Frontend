import { Component, inject, OnInit, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
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

@Component({
  selector: 'app-ticket-details',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './ticket-details.component.html',
  styleUrls: ['./ticket-details.component.css'],
})
export class TicketDetailsComponent implements OnInit {
  // Bound cleanly via withComponentInputBinding() matching the ':id' param string
  @Input() id!: string;

  private readonly ticketService = inject(TicketService);
  private readonly teamService = inject(TeamService);

  // Structural State Signals
  readonly ticket = signal<TicketDto | null>(null);
  readonly availableAgents = signal<TeamMemberDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isActionLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  protected readonly statuses = Object.keys(TicketStatusLabels)
    .filter((k) => !isNaN(Number(k)))
    .map((k) => ({
      value: Number(k),
      label: TicketStatusLabels[Number(k) as TicketStatus],
    }));

  protected readonly statusLabels = TicketStatusLabels;
  protected readonly priorityLabels = TicketPriorityLabels;

  ngOnInit(): void {
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
        this.loadAvailableStaffPool();
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
        if (teams.length > 0) {
          this.teamService.getTeamMembers(teams[0].id).subscribe((members) => {
            this.availableAgents.set(members);
          });
        }
      },
    });
  }

  onStatusChange(event: Event): void {
    const statusVal = Number((event.target as HTMLSelectElement).value);
    this.isActionLoading.set(true);

    this.ticketService.updateStatus(this.id, statusVal).subscribe({
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
