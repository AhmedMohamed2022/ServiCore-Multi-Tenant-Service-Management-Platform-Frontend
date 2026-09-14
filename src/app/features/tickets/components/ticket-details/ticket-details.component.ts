import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { TicketService } from '../../../../core/services/ticket.service';
import { TeamService } from '../../../../core/services/team.service';
import { InvitationService } from '../../../../core/services/invitation.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
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
  private readonly invitationService = inject(InvitationService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Structural State Signals
  readonly ticket = signal<TicketDto | null>(null);
  readonly availableAgents = signal<TeamMemberDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isActionLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Used only to pick which "back" link to render (/app vs /portal). This is
  // navigation cosmetics, not a permission decision, so a URL check is fine
  // here — it never gates a staff control.
  readonly isCustomerPortal = signal<boolean>(false);

  // Real permission signals. Neither of these is inferred from the route or
  // from the JWT's decoded `role` claim (see AuthService.fetchMe) — that
  // claim isn't scoped to the active organization and AppShellComponent
  // deliberately avoids trusting it. Instead we ask the server the same way
  // AppShellComponent does: hit a real endpoint that's already gated with the
  // policy we care about and read the 200/403 outcome.
  //
  // CanManageTickets (Owner/Manager) requires exactly the same role set as
  // CanManageStaff, which is what OrganizationInvitationsController's GET
  // endpoint enforces — the same probe AppShellComponent already performs —
  // so a successful call to it is authoritative for ticket-management rights
  // too, with no extra request needed.
  readonly isManagementAllowed = signal<boolean>(false);

  // There is no side-effect-free endpoint gated by CanWorkAssignedTickets to
  // probe (start/wait-for-customer/resolve all mutate the ticket), so this is
  // derived from the ticket's own AssignedAgentId — real data returned by the
  // server for this specific ticket, not a guessed or cached role. The
  // backend re-checks both the Agent role and this same assignment fact on
  // every lifecycle call regardless, so this only ever controls which
  // buttons we *offer*, never what's actually allowed.
  readonly isAssignedAgent = computed<boolean>(() => {
    const currentTicket = this.ticket();
    const currentUserId = this.authService.currentUser()?.userId;

    return (
      !!currentTicket &&
      !!currentUserId &&
      currentTicket.assignedAgentId === currentUserId
    );
  });

  protected readonly statusLabels = TicketStatusLabels;
  protected readonly priorityLabels = TicketPriorityLabels;
  protected readonly ticketStatusEnum = TicketStatus;

  // Guards against firing the roster request twice: it depends on both the
  // ticket (for its teamId) and the management probe, which resolve
  // independently and in no guaranteed order.
  private rosterRequested = false;

  ngOnInit(): void {
    // Discern url segment origins before pulling database variables
    this.isCustomerPortal.set(this.router.url.includes('/portal/'));
    this.loadTicketContext();
    this.probeManagementPermission();
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
        this.maybeLoadAvailableStaffPool();
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  // See isManagementAllowed above for why this specific endpoint is a valid
  // stand-in for a CanManageTickets probe.
  probeManagementPermission(): void {
    this.invitationService.getInvitations().subscribe({
      next: () => {
        this.isManagementAllowed.set(true);
        this.maybeLoadAvailableStaffPool();
      },
      error: () => this.isManagementAllowed.set(false),
    });
  }

  // Only management ever sees the assignment dropdown, so only load the
  // staff roster once we know both (a) who's allowed to see it and (b) which
  // team the ticket actually belongs to.
  private maybeLoadAvailableStaffPool(): void {
    if (this.rosterRequested) return;

    const currentTicket = this.ticket();
    if (!this.isManagementAllowed() || !currentTicket) return;

    this.rosterRequested = true;
    this.loadAvailableStaffPool(currentTicket.teamId);
  }

  loadAvailableStaffPool(teamId: string): void {
    // Fixed: this used to always load teams()[0]'s members regardless of
    // which team the ticket belonged to, so the dropdown could offer agents
    // who aren't on the ticket's actual team — the backend's
    // TeamMemberExistsAsync check in AssignAsync would then reject them.
    // Loading straight from the ticket's own teamId removes the
    // getTeams()/teams()[0] indirection entirely, so there's no longer a
    // "wrong team" to accidentally pick.
    this.teamService.getTeamMembers(teamId).subscribe({
      next: (members) => this.availableAgents.set(members),
      error: (err: Error) => this.errorMessage.set(err.message),
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
