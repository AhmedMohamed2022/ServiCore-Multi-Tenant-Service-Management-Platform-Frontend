import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { TenantContextService } from '../../../core/services/tenant-context.service';
import { ErrorViewComponent } from '../../ui/error-view/error-view.component';

interface HomeLink {
  readonly link: string;
  readonly label: string;
}

/**
 * Destination of the `**` route. Replaces the old silent redirect to /login,
 * which sent a signed-in person to a sign-in form they did not need and hid
 * the fact that the address was wrong.
 *
 * Read-only: it looks at the session state the app already holds and offers
 * the right way back. It does not call the API and does not decide access;
 * the guards on the target routes still do that.
 *
 *   signed-in customer  -> /portal/tickets
 *   signed-in staff     -> /app/tickets
 *   signed out          -> /login
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, ErrorViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main
      id="mainContent"
      class="flex min-h-screen items-center justify-center px-4 py-10"
    >
      <sc-error-view
        code="404"
        icon="explore_off"
        title="We can't find that page"
        message="The address may be mistyped, or the page may have moved or been removed."
      >
        <a [routerLink]="home().link" class="sc-btn sc-btn-primary">
          {{ home().label }}
        </a>
        @if (signedIn()) {
          <button
            type="button"
            class="sc-btn sc-btn-secondary"
            (click)="back()"
          >
            Go back
          </button>
        } @else {
          <a routerLink="/" class="sc-btn sc-btn-secondary">Home page</a>
        }
      </sc-error-view>
    </main>
  `,
})
export class NotFoundComponent {
  private readonly auth = inject(AuthService);
  private readonly tenant = inject(TenantContextService);

  protected readonly signedIn = computed(() => this.auth.isAuthenticated());

  protected readonly home = computed<HomeLink>(() => {
    if (!this.auth.isAuthenticated()) {
      return { link: '/login', label: 'Go to sign in' };
    }
    // Only customer sessions ever hold a customer id (see TenantContextService).
    if (this.tenant.currentCustomerId()) {
      return { link: '/portal/tickets', label: 'Back to my tickets' };
    }
    // Staff who have not picked an organization yet (several memberships)
    // would be bounced by the shell, so send them to the picker instead.
    if (
      !this.tenant.currentOrganizationId() &&
      this.auth.availableOrganizations().length > 1
    ) {
      return { link: '/select-organization', label: 'Choose an organization' };
    }
    // Customers with no linked organization yet have neither id; the portal
    // guard forwards them to activation. Everyone else with an organization
    // is staff.
    if (!this.tenant.currentOrganizationId()) {
      return { link: '/portal/tickets', label: 'Back to my tickets' };
    }
    return { link: '/app/tickets', label: 'Back to tickets' };
  });

  protected back(): void {
    history.back();
  }
}
