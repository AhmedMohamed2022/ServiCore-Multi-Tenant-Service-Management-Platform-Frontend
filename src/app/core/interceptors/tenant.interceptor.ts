import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TenantContextService } from '../services/tenant-context.service';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const organizationId = inject(TenantContextService).currentOrganizationId();

  // FIX: Safely pull index [0] to get a clean string before stripping trailing slashes
  const urlParts = req.url.split('?');
  const cleanUrl = urlParts[0].replace(/\/$/, '');

  // Strict match checking targeting onboarding and hub endpoints
  const isRegisterRoute = cleanUrl.endsWith('auth/register');
  const isLoginRoute = cleanUrl.endsWith('auth/login');
  const isOrganizationsMineRoute = cleanUrl.endsWith('organizations/mine');
  const isAcceptStaffRoute = cleanUrl.endsWith(
    'organization-invitations/accept',
  );
  const isAcceptCustomerRoute = cleanUrl.endsWith(
    'customer-invitations/accept',
  );

  // Explicitly check if the clean string path context points to a SignalR hub
  const isSignalRHubRoute = cleanUrl.includes('/hubs/');

  const shouldBypass =
    isRegisterRoute ||
    isLoginRoute ||
    isOrganizationsMineRoute ||
    isAcceptStaffRoute ||
    isAcceptCustomerRoute ||
    isSignalRHubRoute; // <-- Safely true now

  if (organizationId && !shouldBypass) {
    req = req.clone({
      setHeaders: {
        'X-Organization-Id': organizationId,
      },
    });
  }

  return next(req);
};
