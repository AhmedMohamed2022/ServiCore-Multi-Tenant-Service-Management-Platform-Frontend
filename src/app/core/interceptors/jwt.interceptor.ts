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
  const isBypassRoute = isAcceptStaffRoute || isAcceptCustomerRoute;

  if (token && !isBypassRoute) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req);
};
