import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InvitationService } from '../../../../core/services/invitation.service';
import { CustomerService } from '../../../../core/services/customer.service';
import { CustomerDto } from '../../models/customer.model';
import {
  InviteOrganizationMemberRequest,
  InviteCustomerRequest,
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
