import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TenantContextService {
  private readonly TENANT_KEY = 'servicore_organization_id';
  // Only ever set for a customer session — the Customer.Id (not the
  // Identity user id) that ticket creation needs to prove "this ticket
  // is being created for yourself." Staff sessions leave this null.
  private readonly CUSTOMER_KEY = 'servicore_customer_id';

  readonly currentOrganizationId = signal<string | null>(
    localStorage.getItem(this.TENANT_KEY),
  );

  readonly currentCustomerId = signal<string | null>(
    localStorage.getItem(this.CUSTOMER_KEY),
  );

  setOrganization(organizationId: string, customerId?: string | null): void {
    localStorage.setItem(this.TENANT_KEY, organizationId);
    this.currentOrganizationId.set(organizationId);

    if (customerId) {
      localStorage.setItem(this.CUSTOMER_KEY, customerId);
      this.currentCustomerId.set(customerId);
    } else {
      localStorage.removeItem(this.CUSTOMER_KEY);
      this.currentCustomerId.set(null);
    }
  }

  clearOrganization(): void {
    localStorage.removeItem(this.TENANT_KEY);
    localStorage.removeItem(this.CUSTOMER_KEY);
    this.currentOrganizationId.set(null);
    this.currentCustomerId.set(null);
  }
}
