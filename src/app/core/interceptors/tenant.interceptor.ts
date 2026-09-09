import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TenantContextService } from '../services/tenant-context.service';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const organizationId = inject(TenantContextService).currentOrganizationId();

  // Clean query strings to ensure proper endpoint evaluation
  const cleanUrl = req.url.split('?')[0].replace(/\/$/, '');

  // Core public paths that must never append organization headers
  const isRegisterRoute = cleanUrl.endsWith('auth/register');
  const isLoginRoute = cleanUrl.endsWith('auth/login');
  const shouldBypass = isRegisterRoute || isLoginRoute;

  if (organizationId && !shouldBypass) {
    req = req.clone({
      setHeaders: {
        'X-Organization-Id': organizationId,
      },
    });
  }

  return next(req);
};
