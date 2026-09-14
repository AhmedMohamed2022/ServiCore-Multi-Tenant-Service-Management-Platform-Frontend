import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { CustomerAccessService } from '../../../../core/services/customer-access.service';
import { CustomerMembership } from '../../../../core/auth/models/auth.models';

type ActivationState = 'loading' | 'choose' | 'manual' | 'error';

@Component({
  selector: 'app-portal-activate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './portal-activate.component.html',
  styleUrl: './portal-activate.component.css',
})
export class PortalActivateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly tenantContext = inject(TenantContextService);
  private readonly customerAccess = inject(CustomerAccessService);

  // 'loading' — checking GET /customers/mine on load.
  // 'choose'  — more than one linked organization; let the person pick.
  // 'manual'  — the lookup itself failed; last-resort GUID entry so the
  //             person isn't completely stuck.
  // 'error'   — lookup succeeded but found no linked organization at all
  //             (e.g. invitation was never actually accepted).
  readonly state = signal<ActivationState>('loading');
  readonly memberships = signal<CustomerMembership[]>([]);

  readonly activationForm = this.fb.nonNullable.group({
    organizationId: [
      '',
      [
        Validators.required,
        Validators.pattern(
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
        ),
      ],
    ],
  });

  ngOnInit(): void {
    this.customerAccess.getMine().subscribe({
      next: (memberships) => {
        if (memberships.length === 1) {
          this.activate(memberships[0]);
          return;
        }

        if (memberships.length > 1) {
          this.memberships.set(memberships);
          this.state.set('choose');
          return;
        }

        this.state.set('error');
      },
      error: () => {
        // Couldn't even reach the lookup — fall back to manual entry
        // rather than leaving the person on a blank/broken screen.
        this.state.set('manual');
      },
    });
  }

  selectMembership(membership: CustomerMembership): void {
    this.activate(membership);
  }

  onActivateSubmit(): void {
    if (this.activationForm.invalid) return;

    const targetId = this.activationForm.getRawValue().organizationId;
    this.tenantContext.setOrganization(targetId);
    this.router.navigate(['/portal/tickets']);
  }

  private activate(membership: CustomerMembership): void {
    this.tenantContext.setOrganization(
      membership.organizationId,
      membership.customerId,
    );
    this.router.navigate(['/portal/tickets']);
  }
}
