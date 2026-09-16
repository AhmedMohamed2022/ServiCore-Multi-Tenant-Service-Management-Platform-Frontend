import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { PermissionsService } from '../services/permissions.service';

/**
 * Owner/Manager only. The 200/403 probe is unchanged — it is just shared
 * through PermissionsService now, so navigating between management pages no
 * longer re-issues the same request on every route change.
 */
export const managementGuard: CanActivateFn = () => {
  const permissions = inject(PermissionsService);
  const router = inject(Router);

  return permissions.probeCanManage().pipe(
    map((allowed) => allowed || router.createUrlTree(['/app/tickets'])),
  );
};
