import { Component, inject, OnInit, signal } from '@angular/core';
import { TenantContextService } from '../../../../../core/services/tenant-context.service';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { OrganizationDto } from '../../../../management/models/organization.model';
@Component({
  selector: 'app-tenant-switcher',
  imports: [],
  templateUrl: './tenant-switcher.component.html',
  styleUrl: './tenant-switcher.component.css',
})
export class TenantSwitcherComponent implements OnInit {
  protected readonly tenantContext = inject(TenantContextService);
  private readonly orgService = inject(OrganizationService);

  readonly organizations = signal<OrganizationDto[]>([]);

  ngOnInit(): void {
    this.orgService.getUserOrganizations().subscribe({
      next: (data) => {
        this.organizations.set(data);

        // Auto-select first tenant context if local storage cache is unassigned
        if (!this.tenantContext.currentOrganizationId() && data.length > 0) {
          this.tenantContext.setOrganization(data[0].id);
        }
      },
    });
  }

  onTenantChange(event: Event): void {
    const selectEl = event.target as HTMLSelectElement;
    if (selectEl.value) {
      this.tenantContext.setOrganization(selectEl.value);
      // Perform a full state reset under the new organization header context
      window.location.reload();
    }
  }
}
