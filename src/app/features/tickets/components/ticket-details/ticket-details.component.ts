import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError, Observable, of } from 'rxjs';

import { TicketService } from '../../../../core/services/ticket.service';
import { TeamService } from '../../../../core/services/team.service';
import { CustomerService } from '../../../../core/services/customer.service';
import { CategoryService } from '../../../../core/services/category.service';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { AgentDirectoryService } from '../../../../core/services/agent-directory.service';
import { AuthService } from '../../../../core/auth/services/auth.service';

import { TicketDto } from '../../models/ticket.model';
import { TeamMemberDto } from '../../../management/models/team.model';
import { CustomerDto } from '../../../management/models/customer.model';
import {
  TicketStatus,
  TICKET_STATUS_ORDER,
  TicketStatusIcons,
  TicketStatusLabels,
} from '../../models/ticket-enums.model';

import { TicketCommentsComponent } from '../ticket-comments/ticket-comments.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import {
  AlertComponent,
  LoadingStateComponent,
} from '../../../../shared/ui/states/states.component';
import { ConfirmService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import {
  TicketPriorityBadgeComponent,
  TicketStatusBadgeComponent,
} from '../../../../shared/ticket/ticket-badges.component';

type WorkflowAction = 'open' | 'start' | 'wait' | 'resolve' | 'close';

/** One node of the lifecycle rail in the right column. */
interface WorkflowStep {
  readonly status: TicketStatus;
  readonly label: string;
  readonly icon: string;
  readonly state: 'done' | 'current' | 'upcoming';
}

@Component({
  selector: 'app-ticket-details',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    FormsModule,
    MatMenuModule,
    MatTooltipModule,
    TicketCommentsComponent,
    PageHeaderComponent,
    IconComponent,
    AvatarComponent,
    AlertComponent,
    LoadingStateComponent,
    TicketStatusBadgeComponent,
    TicketPriorityBadgeComponent,
  ],
  templateUrl: './ticket-details.component.html',
  styleUrls: ['./ticket-details.component.css'],
})
export class TicketDetailsComponent implements OnInit {
  // Bound via withComponentInputBinding() against the ':id' route param.
  @Input() id!: string;

  private readonly ticketService = inject(TicketService);
  private readonly teamService = inject(TeamService);
  private readonly customerService = inject(CustomerService);
  private readonly categoryService = inject(CategoryService);
  private readonly permissions = inject(PermissionsService);
  private readonly agentDirectory = inject(AgentDirectoryService);
  private readonly authService = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly ticket = signal<TicketDto | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isActionLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  /**
   * Context the ticket itself does not carry. TicketDto is ids only, so every
   * human-readable label on this page comes from one of these lookups. Each
   * one fails independently: a 403 on customers must not blank out the
   * conversation.
   */
  readonly customer = signal<CustomerDto | null>(null);
  readonly categoryName = signal<string | null>(null);
  readonly teamName = signal<string | null>(null);
  readonly teamMembers = signal<TeamMemberDto[]>([]);

  /**
   * Route-based only, and only ever used to pick which "back" link to render.
   * It never gates a control — see the permission signals below.
   */
  readonly isCustomerPortal = signal<boolean>(false);

  /**
   * Unchanged probe strategy, now read from the shared cache. The JWT's role
   * claim is not scoped to the active organization, so it is not trusted;
   * instead PermissionsService reads the 200/403 outcome of an endpoint the
   * server already gates with the policy we care about. CanManageStaff (the
   * invitations GET) needs the same role set as CanManageTickets, so one
   * probe answers for both.
   */
  readonly isManagementAllowed = this.permissions.canManage;

  /**
   * No side-effect-free endpoint is gated by CanWorkAssignedTickets (start,
   * wait and resolve all mutate), so this is derived from the ticket's own
   * AssignedAgentId — server data about this specific ticket, not a guessed
   * role. The backend re-checks both the Agent role and the assignment on
   * every lifecycle call, so this only decides which buttons we offer.
   */
  readonly isAssignedAgent = computed<boolean>(() => {
    const currentTicket = this.ticket();
    const currentUserId = this.authService.currentUser()?.userId;
    return (
      !!currentTicket &&
      !!currentUserId &&
      currentTicket.assignedAgentId === currentUserId
    );
  });

  readonly isReadOnlyViewer = computed(
    () => !this.isManagementAllowed() && !this.isAssignedAgent(),
  );

  /**
   * Explains what happens next, and who moves it, whenever the current
   * viewer's role has no header button to click at the ticket's current
   * status.
   *
   * Bug this fixes: the header only shows a button for specific
   * role+status combinations — Owner/Manager get Open (New) and Close
   * (Resolved); the assigned Agent gets Start, Wait and Resolve. Those two
   * branches are mutually exclusive (`@if (isManagementAllowed()) {…} @else
   * if (isAssignedAgent()) {…}`), which is correct — the backend's
   * CanWorkAssignedTickets policy requires the Agent role specifically, so a
   * Manager can never legitimately be the assigned agent. But that left a
   * real gap: for Open, InProgress and WaitingForCustomer — three of the six
   * statuses — a Manager viewing the ticket saw no header button and no
   * explanation for why, because the old fallback message only covered
   * viewers who were neither a manager nor the assigned agent. A Manager
   * testing the app without any Agent teammates set up had no way to tell
   * "there's nothing for me to click here" from "the controls are broken."
   */
  readonly workflowHint = computed<string | null>(() => {
    const t = this.ticket();
    if (!t || this.isCustomerPortal()) return null;

    const status = t.status;
    const assignee = this.assigneeName();

    if (this.isManagementAllowed()) {
      switch (status) {
        case TicketStatus.Open:
          return assignee
            ? `Waiting on ${assignee} to start work. Reassign it below if needed.`
            : 'Assign an agent below so work can begin.';
        case TicketStatus.InProgress:
          return `${assignee ?? 'The assigned agent'} is actively working this ticket.`;
        case TicketStatus.WaitingForCustomer:
          return `Waiting on the customer's reply. ${assignee ?? 'The assigned agent'} can resume once they respond.`;
        default:
          // New and Resolved already have a header button.
          return null;
      }
    }

    if (this.isAssignedAgent()) {
      if (status === TicketStatus.Resolved) {
        return "Resolved. A manager will close it once they're satisfied with the outcome.";
      }
      // Open, WaitingForCustomer and InProgress already have a header button.
      return null;
    }

    return 'Workflow actions are available to this ticket\'s assigned agent and to organization managers.';
  });

  readonly isClosed = computed(
    () => this.ticket()?.status === TicketStatus.Closed,
  );

  /**
   * Display name for whoever the ticket is assigned to. AgentDirectoryService
   * is the only userId -> name source in the API and it is Manager-gated, so
   * an Agent viewing their own ticket sees the abbreviated id instead. That is
   * still better than the previous behaviour, which read a field
   * (`assignedAgentName`) the server has never sent and therefore always
   * printed "Awaiting Allocation" even on an assigned ticket.
   */
  readonly assigneeName = computed<string | null>(() => {
    const agentId = this.ticket()?.assignedAgentId;
    if (!agentId) return null;
    if (agentId === this.authService.currentUser()?.userId) return 'You';
    return this.agentDirectory.labelFor(agentId, 'Agent');
  });

  /** Agent options for the assignment menu, labelled as well as we can. */
  readonly assignableAgents = computed(() =>
    this.teamMembers().map((member) => ({
      userId: member.userId,
      name: this.agentDirectory.labelFor(member.userId, 'Agent'),
      isCurrent: member.userId === this.ticket()?.assignedAgentId,
    })),
  );

  /**
   * The lifecycle rail. Statuses are shown in their real workflow order and
   * marked done/current/upcoming — no status can be set directly from it, so
   * it cannot become a backdoor around the transition rules.
   */
  readonly workflowSteps = computed<WorkflowStep[]>(() => {
    const current = this.ticket()?.status;
    if (!current) return [];

    return TICKET_STATUS_ORDER.map((status) => ({
      status,
      label: TicketStatusLabels[status],
      icon: TicketStatusIcons[status],
      state:
        status < current ? 'done' : status === current ? 'current' : 'upcoming',
    }));
  });

  readonly breadcrumbs = computed(() => [
    {
      label: this.isCustomerPortal() ? 'My tickets' : 'Tickets',
      link: this.isCustomerPortal() ? '/portal/tickets' : '/app/tickets',
    },
    { label: this.shortId() },
  ]);

  readonly shortId = computed(() =>
    this.ticket() ? `#${this.ticket()!.id.substring(0, 8)}` : '',
  );

  protected readonly TicketStatus = TicketStatus;

  /**
   * Guards against firing the roster request twice: it depends on both the
   * ticket (for its teamId) and the management probe, which resolve
   * independently and in no guaranteed order.
   */
  private rosterRequested = false;

  ngOnInit(): void {
    this.isCustomerPortal.set(this.router.url.includes('/portal/'));
    this.agentDirectory.loadIfPermitted();
    this.loadTicketContext();
    this.probeManagementPermission();
  }

  loadTicketContext(): void {
    if (!this.id) {
      this.errorMessage.set('No ticket was specified in the address.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.ticketService.getTicketById(this.id).subscribe({
      next: (ticketData) => {
        this.ticket.set(ticketData);
        this.isLoading.set(false);
        this.loadTicketRelations(ticketData);
        this.maybeLoadAvailableStaffPool();
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  probeManagementPermission(): void {
    this.permissions.probeCanManage().subscribe(() => {
      this.maybeLoadAvailableStaffPool();
    });
  }

  /**
   * Customer, category and team names. All three are best-effort: the page is
   * useful without them and none of them may take the ticket down with it.
   */
  private loadTicketRelations(ticket: TicketDto): void {
    this.customerService
      .getCustomerById(ticket.customerId)
      .pipe(catchError(() => of(null)))
      .subscribe((customer) => this.customer.set(customer));

    this.categoryService
      .getCategoryById(ticket.categoryId)
      .pipe(catchError(() => of(null)))
      .subscribe((category) => this.categoryName.set(category?.name ?? null));

    // The brief calls out that Team was never shown on this page at all.
    this.teamService
      .getTeamById(ticket.teamId)
      .pipe(catchError(() => of(null)))
      .subscribe((team) => this.teamName.set(team?.name ?? null));
  }

  private maybeLoadAvailableStaffPool(): void {
    if (this.rosterRequested) return;

    const currentTicket = this.ticket();
    if (!this.isManagementAllowed() || !currentTicket) return;

    this.rosterRequested = true;

    // Loaded from the ticket's own teamId rather than teams()[0], so the
    // dropdown can only offer agents the backend's TeamMemberExistsAsync
    // check in AssignAsync will actually accept.
    this.teamService
      .getTeamMembers(currentTicket.teamId)
      .pipe(catchError(() => of([])))
      .subscribe((members) => this.teamMembers.set(members));
  }

  // ---------------------------------------------------------------------
  // Workflow
  // ---------------------------------------------------------------------

  executeWorkflowTransition(action: WorkflowAction): void {
    if (action === 'close') {
      this.confirm
        .ask({
          title: 'Close this ticket?',
          message:
            'Closing archives the ticket. No further messages can be added to the conversation afterwards.',
          confirmLabel: 'Close ticket',
          tone: 'danger',
        })
        .subscribe((confirmed) => {
          if (confirmed) this.runTransition(action);
        });
      return;
    }

    this.runTransition(action);
  }

  private runTransition(action: WorkflowAction): void {
    this.isActionLoading.set(true);
    this.errorMessage.set(null);

    const streams: Record<WorkflowAction, () => Observable<void>> = {
      open: () => this.ticketService.openTicket(this.id),
      start: () => this.ticketService.startTicket(this.id),
      wait: () => this.ticketService.waitForCustomer(this.id),
      resolve: () => this.ticketService.resolveTicket(this.id),
      close: () => this.ticketService.closeTicket(this.id),
    };

    const messages: Record<WorkflowAction, string> = {
      open: 'Ticket opened.',
      start: 'Ticket moved to In Progress.',
      wait: 'Ticket is now waiting for the customer.',
      resolve: 'Ticket marked as resolved.',
      close: 'Ticket closed.',
    };

    streams[action]().subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.toast.success(messages[action]);
        this.loadTicketContext();
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.toast.error(err.message);
        this.isActionLoading.set(false);
      },
    });
  }

  onAssignAgent(agentId: string): void {
    if (agentId === this.ticket()?.assignedAgentId) return;

    this.isActionLoading.set(true);
    this.errorMessage.set(null);

    this.ticketService.assignTicket(this.id, agentId).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.toast.success('Ticket assigned.');
        this.loadTicketContext();
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.toast.error(err.message);
        this.isActionLoading.set(false);
      },
    });
  }

  onUnassign(): void {
    this.confirm
      .ask({
        title: 'Return this ticket to the queue?',
        message:
          'The current assignee loses access to the start, wait and resolve actions until someone is assigned again.',
        confirmLabel: 'Unassign',
        tone: 'danger',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.isActionLoading.set(true);
        this.errorMessage.set(null);

        this.ticketService.unassignTicket(this.id).subscribe({
          next: () => {
            this.isActionLoading.set(false);
            this.toast.success('Ticket returned to the queue.');
            this.loadTicketContext();
          },
          error: (err: Error) => {
            this.errorMessage.set(err.message);
            this.toast.error(err.message);
            this.isActionLoading.set(false);
          },
        });
      });
  }
}
