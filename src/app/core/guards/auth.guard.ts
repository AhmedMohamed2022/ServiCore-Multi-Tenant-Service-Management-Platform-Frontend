import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, of } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';

/**
 * Gates every staff and customer route on a valid token, and — this is the
 * part that used to be missing — waits for the user's identity to actually
 * be loaded before letting the navigation through.
 *
 * Previously this only checked `isAuthenticated()` (a token exists) and let
 * the navigation proceed immediately. `currentUser` was populated by a
 * separate, one-shot `fetchMe()` call fired from AuthService's constructor,
 * with no connection to routing and no retry. On a hard refresh, if that
 * request lost a race against the shell's other startup calls or hit any
 * transient failure, `currentUser` stayed null for the rest of the page
 * load — every name and avatar reading it rendered blank, and the guard had
 * already let the person in, so there was nothing left to trigger a retry.
 *
 * `ensureUserLoaded()` retries transient failures and is called here, on
 * every navigation, not just once at boot. A genuinely invalid token (401)
 * still ends in AuthService.logout() redirecting to /login, same as before.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return of(false);
  }

  return authService.ensureUserLoaded().pipe(
    map(() => {
      // Whether the identity load just succeeded or is still being retried,
      // the token itself is valid — let the navigation through. A 401 inside
      // ensureUserLoaded() has already redirected to /login via logout(),
      // so returning true here in that case is harmless: the router is
      // already on its way elsewhere.
      return true;
    }),
  );
};
