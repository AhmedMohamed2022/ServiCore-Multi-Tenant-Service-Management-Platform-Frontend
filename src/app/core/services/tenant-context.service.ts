import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TenantContextService {
  private readonly TENANT_KEY = 'servicore_organization_id';

  readonly currentOrganizationId = signal<string | null>(
    localStorage.getItem(this.TENANT_KEY),
  );

  setOrganization(organizationId: string): void {
    localStorage.setItem(this.TENANT_KEY, organizationId);
    this.currentOrganizationId.set(organizationId);
  }

  clearOrganization(): void {
    localStorage.removeItem(this.TENANT_KEY);
    this.currentOrganizationId.set(null);
  }
}
