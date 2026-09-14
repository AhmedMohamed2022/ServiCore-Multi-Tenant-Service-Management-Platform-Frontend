import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InvitationService } from '../../../../core/services/invitation.service';
import { CustomerService } from '../../../../core/services/customer.service';
import { CustomerDto } from '../../models/customer.model';
import {
  InviteOrganizationMemberRequest,
  InviteCustomerRequest,
  OrganizationInvitationDto,
} from '../../models/invitation.model';

@Component({
  selector: 'app-invitations-console',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './invitations-console.component.html',
  styleUrls: ['./invitations-console.component.css'],
})
export class InvitationsConsoleComponent implements OnInit {
  private readonly invitationService = inject(InvitationService);
  private readonly customerService = inject(CustomerService);
  private readonly fb = inject(FormBuilder);

  readonly customersList = signal<CustomerDto[]>([]);
  readonly isStaffSubmitting = signal<boolean>(false);
  readonly isCustomerSubmitting = signal<boolean>(false);
  readonly isCustomersLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Staff invitations list (backend supports list + revoke).
  // Customer invitations have no GetAll endpoint on the backend yet, so
  // there is nothing to list here for them — see class-level note below.
  readonly staffInvitations = signal<OrganizationInvitationDto[]>([]);
  readonly isInvitationsLoading = signal<boolean>(false);
  readonly revokingInvitationId = signal<string | null>(null);

  // Forms use tracking strings for values to ensure clean browser option mapping
  readonly staffForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['3', [Validators.required]], // Default value set to '3' (Agent Enum) as string
  });

  readonly customerForm = this.fb.group({
    customerId: ['', [Validators.required]],
  });

  ngOnInit(): void {
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
          `Failed to retrieve pending invitations: ${err.message}`,
        );
        this.isInvitationsLoading.set(false);
      },
    });
  }

  revokeStaffInvitation(invitation: OrganizationInvitationDto): void {
    this.revokingInvitationId.set(invitation.id);
    this.clearAlertMessages();

    this.invitationService.revokeStaffInvitation(invitation.id).subscribe({
      next: () => {
        this.revokingInvitationId.set(null);
        this.successMessage.set(`Invitation for ${invitation.email} revoked.`);
        this.loadStaffInvitations();
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.revokingInvitationId.set(null);
      },
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

  invitationStatusLabel(invitation: OrganizationInvitationDto): string {
    if (invitation.isAccepted) return 'Accepted';
    if (invitation.isRevoked) return 'Revoked';
    if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
      return 'Expired';
    }
    return 'Pending';
  }

  loadActiveCustomers(): void {
    this.isCustomersLoading.set(true);
    this.customerService.getCustomers().subscribe({
      next: (data) => {
        this.customersList.set(data);
        this.isCustomersLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(
          `Failed to retrieve customer accounts registry: ${err.message}`,
        );
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
    this.clearAlertMessages();

    const formValues = this.staffForm.value;

    // Explicit integer base-10 conversion eliminates enum role mapping errors
    const payload: InviteOrganizationMemberRequest = {
      email: (formValues.email ?? '').trim(),
      role: parseInt(formValues.role ?? '3', 10),
    };

    this.invitationService.sendStaffInvitation(payload).subscribe({
      next: () => {
        this.isStaffSubmitting.set(false);
        this.staffForm.reset({ email: '', role: '3' });
        this.successMessage.set(
          'Staff invitation link generated successfully.',
        );
        this.loadStaffInvitations();
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
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
    this.clearAlertMessages();

    const formValues = this.customerForm.value;

    // Aligned perfectly with your backend public record InviteCustomerRequest(Guid CustomerId)
    const payload: InviteCustomerRequest = {
      customerId: formValues.customerId ?? '',
    };

    this.invitationService.sendCustomerInvitation(payload).subscribe({
      next: () => {
        this.isCustomerSubmitting.set(false);
        this.customerForm.reset({ customerId: '' });
        this.successMessage.set(
          'Customer registration invitation token generated successfully.',
        );
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isCustomerSubmitting.set(false);
      },
    });
  }

  private clearAlertMessages(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}
