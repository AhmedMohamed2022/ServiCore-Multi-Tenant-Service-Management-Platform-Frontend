import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, shareReplay, tap } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { InvitationService } from './invitation.service';
import { ReportingService } from './reporting.service';
import { TenantContextService } from './tenant-context.service';

/**
 * Caches the role probes the application already relies on.
 *
 * The probe *strategy* is unchanged and deliberate: there is no per-organization
 * role on the user object, and the JWT's decoded `role` claim isn't scoped to
 * the active organization, so neither can be trusted. Instead we call an
 * endpoint the server already gates with exactly the policy we care about and
 * read the 200/403 outcome. See the comments in AppShellComponent and
 * TicketDetailsComponent for the original reasoning.
 *
 * What changes here is only *how often* we ask. Previously AppShellComponent,
 * managementGuard, reportsGuard and TicketDetailsComponent each fired their own
 * request, so a single navigation could produce four probes and the sidebar
 * links would visibly pop in after the page had already rendered. Each probe is
 * now made once per organization and shared.
 *
 * This is a caching layer, not an authorisation decision. The backend re-checks
 * every policy on every call regardless; these signals only decide which
 * controls we bother to *offer*.
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly invitationService = inject(InvitationService);
  private readonly reportingService = inject(ReportingService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly authService = inject(AuthService);

  /**
   * Owner or Manager. CanManageStaff (which the invitations GET enforces)
   * requires the same role set as CanManageTickets, so one probe answers for
   * both.
   */
  readonly canManage = signal<boolean>(false);

  /** Owner or Manager — the policy behind the reporting endpoints. */
  readonly canViewReports = signal<boolean>(false);

  /** False until both probes have settled, so the nav can avoid flicker. */
  readonly isResolved = signal<boolean>(false);

  readonly isStaffOperator = computed(
    () => this.canManage() || this.canViewReports(),
  );

  /** Keyed by organization id, so switching tenants re-probes exactly once. */
  private manageProbe$: Observable<boolean> | null = null;
  private reportsProbe$: Observable<boolean> | null = null;
  private probedOrganizationId: string | null = null;

  constructor() {
    // A new session must never inherit the previous user's answers.
    this.authService.sessionEnded$.subscribe(() => this.reset());
  }

  probeCanManage(): Observable<boolean> {
    this.invalidateIfTenantChanged();

    this.manageProbe$ ??= this.invitationService.getInvitations().pipe(
      map(() => true),
      catchError(() => of(false)),
      tap((allowed) => {
        this.canManage.set(allowed);
        this.markResolved();
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.manageProbe$;
  }

  probeCanViewReports(): Observable<boolean> {
    this.invalidateIfTenantChanged();

    this.reportsProbe$ ??= this.reportingService.getDashboardOverview({}).pipe(
      map(() => true),
      catchError(() => of(false)),
      tap((allowed) => {
        this.canViewReports.set(allowed);
        this.markResolved();
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.reportsProbe$;
  }

  /** Runs both probes; used by the shell to populate navigation once. */
  probeAll(): void {
    this.probeCanManage().subscribe();
    this.probeCanViewReports().subscribe();
  }

  reset(): void {
    this.manageProbe$ = null;
    this.reportsProbe$ = null;
    this.probedOrganizationId = null;
    this.canManage.set(false);
    this.canViewReports.set(false);
    this.isResolved.set(false);
  }

  private invalidateIfTenantChanged(): void {
    const organizationId = this.tenantContext.currentOrganizationId();
    if (organizationId !== this.probedOrganizationId) {
      this.manageProbe$ = null;
      this.reportsProbe$ = null;
      this.probedOrganizationId = organizationId;
      this.isResolved.set(false);
    }
  }

  private markResolved(): void {
    if (this.manageProbe$ && this.reportsProbe$) {
      this.isResolved.set(true);
    }
  }
}
