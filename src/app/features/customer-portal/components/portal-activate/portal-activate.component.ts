import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TenantContextService } from '../../../../core/services/tenant-context.service';

@Component({
  selector: 'app-portal-activate',
  imports: [ReactiveFormsModule],
  templateUrl: './portal-activate.component.html',
  styleUrl: './portal-activate.component.css',
})
export class PortalActivateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly tenantContext = inject(TenantContextService);

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

  onActivateSubmit(): void {
    if (this.activationForm.invalid) return;

    const targetId = this.activationForm.getRawValue().organizationId;
    this.tenantContext.setOrganization(targetId);

    // With the workspace context assigned, route safely back into the sandboxed queue
    this.router.navigate(['/portal/tickets']);
  }
}
