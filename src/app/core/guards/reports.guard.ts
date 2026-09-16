import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { PermissionsService } from '../services/permissions.service';

/**
 * Reporting is Owner/Manager only. Previously this fired a full dashboard
 * request on every single report navigation; the probe result is now shared
 * for the lifetime of the organization selection.
 */
export const reportsGuard: CanActivateFn = () => {
  const permissions = inject(PermissionsService);
  const router = inject(Router);

  return permissions.probeCanViewReports().pipe(
    map((allowed) => allowed || router.createUrlTree(['/app/tickets'])),
  );
};
