import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { InvitationService } from '../../../../core/services/invitation.service';
import { CustomerService } from '../../../../core/services/customer.service';
import { CustomerDto } from '../../models/customer.model';
import {
  InviteOrganizationMemberRequest,
  InviteCustomerRequest,
  OrganizationInvitationDto,
} from '../../models/invitation.model';

import { CountUpDirective } from '../../../dashboard/widgets/directives/count-up.directive';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  AlertComponent,
  EmptyStateComponent,
} from '../../../../shared/ui/states/states.component';
import { ConfirmService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

type InvitationStatus = 'Pending' | 'Accepted' | 'Revoked' | 'Expired';
type StatusFilter = 'all' | 'pending' | 'accepted' | 'closed';

const SOON_MS = 48 * 60 * 60 * 1000;

@Component({
  selector: 'app-invitations-console',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    IconComponent,
    AlertComponent,
    EmptyStateComponent,
    CountUpDirective,
  ],
  templateUrl: './invitations-console.component.html',
  styleUrls: ['./invitations-console.component.css'],
})
export class InvitationsConsoleComponent implements OnInit {
  private readonly invitationService = inject(InvitationService);
  private readonly customerService = inject(CustomerService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly customersList = signal<CustomerDto[]>([]);
  readonly isStaffSubmitting = signal<boolean>(false);
  readonly isCustomerSubmitting = signal<boolean>(false);
  readonly isCustomersLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Staff invitations list (backend supports list + revoke).
  // Customer invitations have no GetAll endpoint on the backend yet, so
  // there is nothing to list here for them — see the note at the bottom of
  // the template.
  readonly staffInvitations = signal<OrganizationInvitationDto[]>([]);
  readonly isInvitationsLoading = signal<boolean>(false);
  readonly revokingInvitationId = signal<string | null>(null);

  // ---- Presentation state for the staff invitations list ----------------
  readonly statusFilter = signal<StatusFilter>('all');
  readonly searchTerm = signal<string>('');
  /** Which invite form is shown on narrow screens, where both would stack. */
  readonly inviteTab = signal<'staff' | 'customer'>('staff');

  readonly counts = computed(() => {
    const list = this.staffInvitations();
    const label = (i: OrganizationInvitationDto) =>
      this.invitationStatusLabel(i);
    const pending = list.filter((i) => label(i) === 'Pending');
    return {
      all: list.length,
      pending: pending.length,
      soon: pending.filter(
        (i) => new Date(i.expiresAt).getTime() - Date.now() <= SOON_MS,
      ).length,
      accepted: list.filter((i) => label(i) === 'Accepted').length,
      closed: list.filter((i) => ['Revoked', 'Expired'].includes(label(i)))
        .length,
    };
  });

  readonly visibleInvitations = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.statusFilter();
    const rank: Record<InvitationStatus, number> = {
      Pending: 0,
      Accepted: 1,
      Expired: 2,
      Revoked: 3,
    };

    return this.staffInvitations()
      .filter((i) => {
        const status = this.invitationStatusLabel(i);
        if (filter === 'pending') return status === 'Pending';
        if (filter === 'accepted') return status === 'Accepted';
        if (filter === 'closed')
          return status === 'Revoked' || status === 'Expired';
        return true;
      })
      .filter(
        (i) =>
          !term ||
          i.email.toLowerCase().includes(term) ||
          i.role.toLowerCase().includes(term),
      )
      .sort(
        (a, b) =>
          rank[this.invitationStatusLabel(a)] -
            rank[this.invitationStatusLabel(b)] ||
          Date.parse(b.createdAt) - Date.parse(a.createdAt),
      );
  });

  readonly hasFilters = computed(
    () => this.statusFilter() !== 'all' || this.searchTerm().trim().length > 0,
  );

  readonly staffForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['3', [Validators.required]], // '3' = Agent; see InviteOrganizationMemberRequest
  });

  readonly customerForm = this.fb.nonNullable.group({
    customerId: ['', [Validators.required]],
  });

  private static readonly STATUS_TONE: Record<
    InvitationStatus,
    'info' | 'success' | 'neutral' | 'warn'
  > = {
    Pending: 'info',
    Accepted: 'success',
    Revoked: 'neutral',
    Expired: 'warn',
  };

  private static readonly STATUS_ICON: Record<InvitationStatus, string> = {
    Pending: 'schedule',
    Accepted: 'check_circle',
    Revoked: 'block',
    Expired: 'event_busy',
  };

  ngOnInit(): void {
    this.loadActiveCustomers();
    this.loadStaffInvitations();
  }

  refreshAll(): void {
    this.loadActiveCustomers();
    this.loadStaffInvitations();
  }

  loadStaffInvitations(): void {
    this.isInvitationsLoading.set(true);
    this.invitationService.getInvitations().subscribe({
      next: (data) => {
        this.staffInvitations.set(data);
        this.isInvitationsLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(
          `Couldn't load pending invitations: ${err.message}`,
        );
        this.isInvitationsLoading.set(false);
      },
    });
  }

  loadActiveCustomers(): void {
    this.isCustomersLoading.set(true);
    this.customerService.getCustomers().subscribe({
      next: (data) => {
        this.customersList.set(data.filter((c) => c.isActive));
        this.isCustomersLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(`Couldn't load customers: ${err.message}`);
        this.isCustomersLoading.set(false);
      },
    });
  }

  onStaffInviteSubmit(): void {
    if (this.staffForm.invalid) {
      this.staffForm.markAllAsTouched();
      return;
    }

    this.isStaffSubmitting.set(true);

    const formValues = this.staffForm.getRawValue();
    const payload: InviteOrganizationMemberRequest = {
      email: formValues.email.trim(),
      role: parseInt(formValues.role, 10),
    };

    this.invitationService.sendStaffInvitation(payload).subscribe({
      next: () => {
        this.isStaffSubmitting.set(false);
        this.toast.success(`Invitation sent to ${payload.email}.`);
        this.staffForm.reset({ email: '', role: '3' });
        this.loadStaffInvitations();
      },
      error: (err: Error) => {
        this.toast.error(err.message);
        this.isStaffSubmitting.set(false);
      },
    });
  }

  onCustomerInviteSubmit(): void {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    this.isCustomerSubmitting.set(true);

    const formValues = this.customerForm.getRawValue();
    const customerName = this.customersList().find(
      (c) => c.id === formValues.customerId,
    )?.name;

    const payload: InviteCustomerRequest = {
      customerId: formValues.customerId,
    };

    this.invitationService.sendCustomerInvitation(payload).subscribe({
      next: () => {
        this.isCustomerSubmitting.set(false);
        this.toast.success(
          customerName
            ? `Invitation sent to ${customerName}.`
            : 'Invitation sent.',
        );
        this.customerForm.reset({ customerId: '' });
      },
      error: (err: Error) => {
        this.toast.error(err.message);
        this.isCustomerSubmitting.set(false);
      },
    });
  }

  onRevokeClick(invitation: OrganizationInvitationDto): void {
    this.confirm
      .ask({
        title: `Revoke invitation for ${invitation.email}?`,
        message:
          "They won't be able to use this invitation link to join the organization. You can send a new one at any time.",
        confirmLabel: 'Revoke invitation',
        tone: 'danger',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.revokingInvitationId.set(invitation.id);
        this.invitationService.revokeStaffInvitation(invitation.id).subscribe({
          next: () => {
            this.revokingInvitationId.set(null);
            this.toast.success(`Invitation for ${invitation.email} revoked.`);
            this.loadStaffInvitations();
          },
          error: (err: Error) => {
            this.toast.error(err.message);
            this.revokingInvitationId.set(null);
          },
        });
      });
  }

  // A pending invitation is one that hasn't been accepted, hasn't been
  // revoked, and hasn't passed its expiry timestamp.
  isPending(invitation: OrganizationInvitationDto): boolean {
    return (
      !invitation.isAccepted &&
      !invitation.isRevoked &&
      new Date(invitation.expiresAt).getTime() > Date.now()
    );
  }

  invitationStatusLabel(
    invitation: OrganizationInvitationDto,
  ): InvitationStatus {
    if (invitation.isAccepted) return 'Accepted';
    if (invitation.isRevoked) return 'Revoked';
    if (new Date(invitation.expiresAt).getTime() <= Date.now())
      return 'Expired';
    return 'Pending';
  }

  statusTone(invitation: OrganizationInvitationDto) {
    return InvitationsConsoleComponent.STATUS_TONE[
      this.invitationStatusLabel(invitation)
    ];
  }

  statusIcon(invitation: OrganizationInvitationDto): string {
    return InvitationsConsoleComponent.STATUS_ICON[
      this.invitationStatusLabel(invitation)
    ];
  }

  clearFilters(): void {
    this.statusFilter.set('all');
    this.searchTerm.set('');
  }

  /** "Expires in 5 h", "Expires in 3 days", or when it ended, for the row. */
  expiryLabel(invitation: OrganizationInvitationDto): string {
    const status = this.invitationStatusLabel(invitation);
    if (status === 'Accepted' || status === 'Revoked') return '';
    const delta = new Date(invitation.expiresAt).getTime() - Date.now();
    const abs = Math.abs(delta);
    const hours = Math.max(1, Math.round(abs / 3_600_000));
    const amount =
      hours < 48
        ? `${hours} ${hours === 1 ? 'hour' : 'hours'}`
        : `${Math.round(hours / 24)} days`;
    return delta > 0 ? `Expires in ${amount}` : `Expired ${amount} ago`;
  }

  isExpiringSoon(invitation: OrganizationInvitationDto): boolean {
    return (
      this.isPending(invitation) &&
      new Date(invitation.expiresAt).getTime() - Date.now() <= SOON_MS
    );
  }

  goToCustomers(): void {
    this.router.navigate(['/app/management/customers']);
  }
}
