import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { InvitationService } from '../../../../core/services/invitation.service';
import { CustomerService } from '../../../../core/services/customer.service';
import { CustomerDto } from '../../models/customer.model';
import {
  InviteOrganizationMemberRequest,
  InviteCustomerRequest,
  OrganizationInvitationDto,
} from '../../models/invitation.model';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  AlertComponent,
  EmptyStateComponent,
  LoadingStateComponent,
} from '../../../../shared/ui/states/states.component';
import { ConfirmService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

type InvitationStatus = 'Pending' | 'Accepted' | 'Revoked' | 'Expired';

@Component({
  selector: 'app-invitations-console',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    PageHeaderComponent,
    IconComponent,
    AlertComponent,
    EmptyStateComponent,
    LoadingStateComponent,
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
        this.errorMessage.set(`Couldn't load pending invitations: ${err.message}`);
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
          customerName ? `Invitation sent to ${customerName}.` : 'Invitation sent.',
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

  invitationStatusLabel(invitation: OrganizationInvitationDto): InvitationStatus {
    if (invitation.isAccepted) return 'Accepted';
    if (invitation.isRevoked) return 'Revoked';
    if (new Date(invitation.expiresAt).getTime() <= Date.now()) return 'Expired';
    return 'Pending';
  }

  statusTone(invitation: OrganizationInvitationDto) {
    return InvitationsConsoleComponent.STATUS_TONE[this.invitationStatusLabel(invitation)];
  }

  statusIcon(invitation: OrganizationInvitationDto): string {
    return InvitationsConsoleComponent.STATUS_ICON[this.invitationStatusLabel(invitation)];
  }

  goToCustomers(): void {
    this.router.navigate(['/app/management/customers']);
  }
}
