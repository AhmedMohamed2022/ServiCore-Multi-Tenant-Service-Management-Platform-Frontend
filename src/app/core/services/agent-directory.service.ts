import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, shareReplay, tap } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { PermissionsService } from './permissions.service';
import { ReportingService } from './reporting.service';
import { TenantContextService } from './tenant-context.service';

/**
 * Resolves Identity user ids to display names.
 *
 * ---------------------------------------------------------------------------
 * Why this service exists at all
 * ---------------------------------------------------------------------------
 * Nothing in the ServiCore API returns a user's name alongside a user id,
 * with exactly one exception. A survey of every endpoint that carries a user
 * id turns up:
 *
 *   TicketDto.AssignedAgentId      -> Guid only
 *   TicketCommentDto.AuthorUserId  -> Guid only
 *   TeamMemberDto                  -> (TeamId, UserId, JoinedAt) — no name
 *   CustomerDto                    -> Customer entity id, deliberately not
 *                                     the customer's Identity user id
 *   OrganizationInvitationDto      -> an invited email, but no user id to
 *                                     join it against once accepted
 *
 * The exception is GET /reports/agents. ServiCoreDbContext.GetAgentStatistics
 * starts from OrganizationMembers where Role == Agent and joins Identity
 * Users, projecting AgentStatisticsDto(AgentId, AgentUserName, ...). AgentId
 * is the Identity user id and AgentUserName is that user's Identity UserName.
 * It covers every Agent in the organization, not only agents who happen to
 * have tickets, because the query is driven by membership rather than by the
 * ticket table.
 *
 * So this is a real, complete directory — for Agents.
 *
 * ---------------------------------------------------------------------------
 * What it deliberately does not claim
 * ---------------------------------------------------------------------------
 * Two limits, and no part of the UI may pretend otherwise:
 *
 *  1. Owners and Managers are not in it. The query filters on the Agent role.
 *  2. It is gated behind the reporting policy, so an Agent or a customer
 *     calling it gets a 403.
 *
 * Both failure modes resolve to an empty map rather than an error, and every
 * caller is expected to fall back to something honest — a role label, or a
 * short form of the id — instead of inventing a name.
 *
 * Caching follows PermissionsService: one request per organization, shared,
 * invalidated on tenant switch and cleared when the session ends.
 */
@Injectable({ providedIn: 'root' })
export class AgentDirectoryService {
  private readonly reportingService = inject(ReportingService);
  private readonly permissions = inject(PermissionsService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly authService = inject(AuthService);

  /** Identity user id -> display name. Empty when unavailable. */
  readonly names = signal<Map<string, string>>(new Map());

  /**
   * True once a lookup has settled, whatever the outcome. Callers use this to
   * tell "we know this user is not an Agent" apart from "we have not looked
   * yet", which changes what label is honest to show.
   */
  readonly isResolved = signal<boolean>(false);

  /** True when the directory actually returned data we can trust. */
  readonly isAvailable = computed(() => this.names().size > 0);

  private lookup$: Observable<Map<string, string>> | null = null;
  private loadedOrganizationId: string | null = null;

  constructor() {
    this.authService.sessionEnded$.subscribe(() => this.reset());
  }

  load(): Observable<Map<string, string>> {
    this.invalidateIfTenantChanged();

    this.lookup$ ??= this.reportingService.getAgentStatistics({}).pipe(
      map(
        (agents) =>
          new Map(
            agents
              // A blank UserName is possible (the query coalesces null to an
              // empty string); an entry with no name is worse than no entry,
              // because it would render as an empty author line.
              .filter((agent) => !!agent.agentUserName?.trim())
              .map((agent) => [agent.agentId, agent.agentUserName.trim()]),
          ),
      ),
      // A 403 here is the expected outcome for Agents and customers, not a
      // fault. Callers degrade rather than surface an error.
      catchError(() => of(new Map<string, string>())),
      tap((names) => {
        this.names.set(names);
        this.isResolved.set(true);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.lookup$;
  }

  /**
   * Skips the request entirely when the reporting probe already told us it
   * would 403. Saves a guaranteed-failing call on every ticket an Agent opens.
   */
  loadIfPermitted(): void {
    if (!this.permissions.canViewReports()) {
      this.isResolved.set(true);
      return;
    }
    this.load().subscribe();
  }

  /** Display name for a user id, or null when we genuinely do not know. */
  nameFor(userId: string | null | undefined): string | null {
    if (!userId) return null;
    return this.names().get(userId) ?? null;
  }

  /**
   * Name when known, otherwise a short, stable, obviously-technical stand-in.
   * Used where a row has to render something and a role label would not fit.
   */
  labelFor(userId: string | null | undefined, fallbackPrefix = 'User'): string {
    if (!userId) return '';
    return this.nameFor(userId) ?? `${fallbackPrefix} ${userId.substring(0, 8)}`;
  }

  reset(): void {
    this.lookup$ = null;
    this.loadedOrganizationId = null;
    this.names.set(new Map());
    this.isResolved.set(false);
  }

  private invalidateIfTenantChanged(): void {
    const organizationId = this.tenantContext.currentOrganizationId();
    if (organizationId !== this.loadedOrganizationId) {
      this.lookup$ = null;
      this.loadedOrganizationId = organizationId;
      this.names.set(new Map());
      this.isResolved.set(false);
    }
  }
}
