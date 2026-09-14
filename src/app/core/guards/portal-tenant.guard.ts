import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TenantContextService } from '../services/tenant-context.service';

// Applied to every /portal child route except activate-device itself.
// Without this, a customer whose tenant context is missing or gets lost
// (direct URL navigation, a stale bookmark, clearing localStorage
// mid-session, etc.) would call GET /tickets with no X-Organization-Id
// header and see a raw "400 A valid X-Organization-Id header is required"
// error instead of being routed somewhere useful.
export const portalTenantGuard: CanActivateFn = () => {
  const tenantContext = inject(TenantContextService);
  const router = inject(Router);

  if (tenantContext.currentOrganizationId()) {
    return true;
  }

  return router.createUrlTree(['/portal/activate-device']);
};
