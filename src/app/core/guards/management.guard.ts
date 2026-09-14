import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { InvitationService } from '../services/invitation.service';

// Route-level counterpart to AppShellComponent.isManagementAllowed(): there is
// no "roles" claim anywhere in the JWT, and role is purely a per-organization
// membership fact, so rather than guessing client-side we ask the server
// directly using an endpoint it already gates with exactly the policy we
// care about (CanManageStaff — Owner/Manager only). A 200 means the current
// user is allowed to manage staff in the active org; a 403 (or any other
// error) means they're not, and we redirect away instead of letting a
// broken/inaccessible management page load.
//
// This only covers /app/management/* today. If you later want the same
// protection on /app/reports/*, note that those endpoints are gated by a
// separate policy (CanViewReports) that currently happens to allow the same
// roles (Owner/Manager) as CanManageStaff, but is not guaranteed to stay in
// lockstep with it — a change to one policy wouldn't automatically apply to
// the other.
export const managementGuard: CanActivateFn = (route, state) => {
  const invitationService = inject(InvitationService);
  const router = inject(Router);

  return invitationService.getInvitations().pipe(
    map(() => true),
    catchError(() => {
      router.navigate(['/app/dashboard']);
      return of(false);
    }),
  );
};
