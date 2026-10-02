import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();

  const cleanUrl = req.url.split('?')[0].replace(/\/$/, '');

  // Do not append bearer tokens to anonymous invitation acceptance endpoints
  const isAcceptStaffRoute = cleanUrl.endsWith(
    'organization/invitations/accept',
  );
  const isAcceptCustomerRoute = cleanUrl.endsWith(
    'customer-invitations/accept',
  );
  const isPreviewStaffRoute = cleanUrl.endsWith(
    'organization/invitations/preview',
  );
  const isPreviewCustomerRoute = cleanUrl.endsWith(
    'customer-invitations/preview',
  );
  const isBypassRoute =
    isAcceptStaffRoute ||
    isAcceptCustomerRoute ||
    isPreviewStaffRoute ||
    isPreviewCustomerRoute;

  if (token && !isBypassRoute) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req);
};
