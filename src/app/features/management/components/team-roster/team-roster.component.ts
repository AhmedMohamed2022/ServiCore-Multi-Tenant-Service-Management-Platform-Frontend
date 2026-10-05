import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';

import { TeamService } from '../../../../core/services/team.service';
import { AgentDirectoryService } from '../../../../core/services/agent-directory.service';
import { OrganizationService } from '../../../../core/services/organization.service';
import { ReportingService } from '../../../../core/services/reporting.service';
import { TeamDto, TeamMemberDto } from '../../models/team.model';
import {
  OrganizationMemberDto,
  OrganizationRole,
} from '../../models/organization.model';

import {
  AgentStatisticsData,
  TeamStatisticsData,
} from '../../../dashboard/models/reporting.model';
import { CountUpDirective } from '../../../dashboard/widgets/directives/count-up.directive';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import {
  AlertComponent,
  EmptyStateComponent,
} from '../../../../shared/ui/states/states.component';
import { ConfirmService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

type RoleLabel = 'Owner' | 'Manager' | 'Agent';
type LoadState = 'loading' | 'ready' | 'unavailable';
type TeamSort = 'name' | 'workload' | 'members';
type PeopleRoleFilter = 'all' | 'owner' | 'manager' | 'agent';

/** A member row with whatever display name we can honestly produce. */
interface RosterEntry {
  readonly userId: string;
  readonly name: string;
  readonly isNamed: boolean;
  readonly joinedAt: string;
  /** From the org member list (or the agent directory); null when unknown. */
  readonly role: RoleLabel | null;
  /** From GET /reports/agents; null for non-agents or when unavailable. */
  readonly activeTickets: number | null;
  readonly resolvedTickets: number | null;
}

/** One organization member in the People view. */
interface PersonRow {
  readonly userId: string;
  readonly name: string;
  readonly role: RoleLabel;
  /** Null until the team memberships have loaded (or if they failed). */
  readonly teams:
    | readonly { id: string; name: string; manageable: boolean }[]
    | null;
  readonly activeTickets: number | null;
  readonly resolvedTickets: number | null;
}

/** A user who could be added to the selected team, as an agent or a manager. */
interface AddableMember {
  readonly userId: string;
  readonly name: string;
}

@Component({
  selector: 'app-team-roster',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    MatMenuModule,
    PageHeaderComponent,
    IconComponent,
    AvatarComponent,
    AlertComponent,
    EmptyStateComponent,
    CountUpDirective,
  ],
  templateUrl: './team-roster.component.html',
  styleUrls: ['./team-roster.component.css'],
})
export class TeamRosterComponent implements OnInit {
  private readonly teamService = inject(TeamService);
  private readonly agentDirectory = inject(AgentDirectoryService);
  private readonly organizationService = inject(OrganizationService);
  private readonly reportingService = inject(ReportingService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly teams = signal<TeamDto[]>([]);
  readonly currentMembers = signal<TeamMemberDto[]>([]);
  readonly orgMembers = signal<OrganizationMemberDto[]>([]);
  readonly selectedTeam = signal<TeamDto | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isTeamLoading = signal<boolean>(false);
  readonly isMemberLoading = signal<boolean>(false);
  readonly isSavingTeam = signal<boolean>(false);
  readonly isAddingMember = signal<boolean>(false);
  readonly editingTeamId = signal<string | null>(null);

  readonly searchTerm = signal<string>('');

  // ---- Presentation state (view toggles, sorting, filters) ----------------
  readonly view = signal<'teams' | 'people'>('teams');
  readonly teamSort = signal<TeamSort>('name');
  readonly rosterSearch = signal<string>('');
  readonly peopleSearch = signal<string>('');
  readonly peopleRole = signal<PeopleRoleFilter>('all');
  readonly onlyUnassigned = signal<boolean>(false);

  // ---- Independent data widgets: each loads and fails on its own ----------
  /** GET /reports/teams: per-team member and ticket counts. */
  readonly teamStats = signal<TeamStatisticsData[]>([]);
  readonly statsState = signal<LoadState>('loading');
  /** GET /reports/agents: per-agent workload. */
  readonly agentStats = signal<AgentStatisticsData[]>([]);
  readonly agentStatsState = signal<LoadState>('loading');
  /** GET /organizations/members. */
  readonly membersState = signal<LoadState>('loading');
  /**
   * userId -> ids of the teams they belong to. Built from one members call
   * per team, and only when the People view is opened, so the roster page
   * does not pay for it up front. Null until loaded.
   */
  readonly memberships = signal<ReadonlyMap<string, readonly string[]> | null>(
    null,
  );
  readonly membershipState = signal<'idle' | 'loading' | 'ready' | 'failed'>(
    'idle',
  );

  private readonly teamNameInput =
    viewChild<ElementRef<HTMLInputElement>>('teamNameInput');

  /**
   * Team ids the current user has a TeamMember row for — see
   * TeamService.getMyTeamMemberships() for how this is derived and its one
   * documented blind spot (an Owner who also happens to hold a TeamMember
   * row reads as restricted too).
   */
  readonly myTeamIds = signal<ReadonlySet<string>>(new Set());

  /**
   * Neither GET /teams nor anything else in the API tells the frontend
   * "you are an Owner" directly — there is no per-organization role
   * endpoint. This page used to show every organization team, and the
   * Create/Edit/Deactivate controls, to any viewer who could reach it at
   * all — including Managers, even though CanManageTeams (create/update/
   * deactivate) is Owner-only on the backend and a Manager only manages
   * agents within teams they themselves belong to. A non-empty
   * `myTeamIds` is read as "this viewer is a Manager, scoped to their own
   * teams"; empty is read as "unrestricted" (the Owner case).
   */
  readonly isRestrictedToOwnTeams = computed(() => this.myTeamIds().size > 0);

  /** Owner-only team administration: create, edit, deactivate. */
  readonly canAdministerTeams = computed(() => !this.isRestrictedToOwnTeams());

  /**
   * Falls back to a raw user-id field when the agent directory is
   * unavailable. That is the pre-existing behaviour, kept as an escape hatch
   * rather than as the default — see the picker notes below.
   */
  readonly useManualUserId = signal<boolean>(false);

  readonly isEditingTeam = computed(() => this.editingTeamId() !== null);

  readonly teamForm = this.fb.nonNullable.group({
    name: [
      '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(60)],
    ],
    description: ['', [Validators.maxLength(200)]],
  });

  readonly memberForm = this.fb.nonNullable.group({
    userId: ['', [Validators.required]],
  });

  /**
   * The org-wide team list, narrowed to "teams this viewer manages" when
   * `isRestrictedToOwnTeams` says so. `visibleTeams` below applies the
   * search filter on top of this; the selection-sync effect in the
   * constructor tracks this list (not the search-filtered one), so typing
   * in the search box never changes which team is open in the right pane.
   */
  readonly manageableTeams = computed(() => {
    const mine = this.myTeamIds();
    const all = this.teams();
    return mine.size === 0 ? all : all.filter((team) => mine.has(team.id));
  });

  readonly teamStatsById = computed(
    () => new Map(this.teamStats().map((stat) => [stat.teamId, stat])),
  );

  readonly statsAvailable = computed(() => this.statsState() === 'ready');

  readonly visibleTeams = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const sort = this.teamSort();
    const stats = this.teamStatsById();

    return this.manageableTeams()
      .filter(
        (team) =>
          !term ||
          team.name.toLowerCase().includes(term) ||
          (team.description ?? '').toLowerCase().includes(term),
      )
      .sort((a, b) => {
        if (sort === 'workload') {
          const delta =
            (stats.get(b.id)?.activeTickets ?? 0) -
            (stats.get(a.id)?.activeTickets ?? 0);
          if (delta) return delta;
        } else if (sort === 'members') {
          const delta =
            (stats.get(b.id)?.memberCount ?? 0) -
            (stats.get(a.id)?.memberCount ?? 0);
          if (delta) return delta;
        }
        return a.name.localeCompare(b.name);
      });
  });

  /** Report rows for the teams this viewer can see, for the KPI strip. */
  private readonly scopeStats = computed(() => {
    const byId = this.teamStatsById();
    return this.manageableTeams()
      .map((team) => byId.get(team.id))
      .filter((stat): stat is TeamStatisticsData => !!stat);
  });

  readonly kpiMemberships = computed(() =>
    this.scopeStats().reduce((sum, stat) => sum + stat.memberCount, 0),
  );
  readonly kpiActiveTickets = computed(() =>
    this.scopeStats().reduce((sum, stat) => sum + stat.activeTickets, 0),
  );
  readonly kpiEmptyTeams = computed(
    () => this.scopeStats().filter((stat) => stat.memberCount === 0).length,
  );

  readonly selectedStats = computed(() => {
    const id = this.selectedTeam()?.id;
    return id ? (this.teamStatsById().get(id) ?? null) : null;
  });

  /** Active, resolved and closed counts as share of the selected team's total. */
  readonly selectedHasTickets = computed(() => {
    const stat = this.selectedStats();
    return (
      !!stat &&
      stat.activeTickets + stat.resolvedTickets + stat.closedTickets > 0
    );
  });

  private readonly agentStatsById = computed(
    () => new Map(this.agentStats().map((stat) => [stat.agentId, stat])),
  );

  /** Role by user id: the org member list first, the agent directory second. */
  private readonly roleById = computed(() => {
    const roles = new Map<string, RoleLabel>();
    for (const member of this.orgMembers()) {
      roles.set(member.userId, TeamRosterComponent.roleLabel(member.role));
    }
    return roles;
  });

  private static roleLabel(role: OrganizationRole): RoleLabel {
    if (role === OrganizationRole.Owner) return 'Owner';
    if (role === OrganizationRole.Manager) return 'Manager';
    return 'Agent';
  }

  /**
   * TeamMemberDto is (TeamId, UserId, JoinedAt) — there is no name on this
   * endpoint at all, which is why this page used to render blank member
   * names. AgentDirectoryService covers Agents; orgMembers (Owner-visible
   * only) covers Managers too, so a Manager added to a team shows their real
   * name instead of falling back to an abbreviated id. Where neither knows
   * the id, the row shows an abbreviated id and says so, rather than
   * rendering an empty string.
   */
  readonly roster = computed<RosterEntry[]>(() => {
    const orgNames = new Map(
      this.orgMembers().map((m) => [m.userId, m.userName]),
    );
    return this.currentMembers()
      .map((member) => {
        const name =
          this.agentDirectory.nameFor(member.userId) ??
          orgNames.get(member.userId) ??
          null;
        const stat = this.agentStatsById().get(member.userId);
        const role =
          this.roleById().get(member.userId) ??
          (this.agentDirectory.nameFor(member.userId) ? 'Agent' : null);
        return {
          userId: member.userId,
          name: name ?? `Unnamed member · ${member.userId.substring(0, 8)}`,
          isNamed: !!name,
          joinedAt: member.joinedAt,
          role,
          activeTickets: stat ? stat.activeTickets : null,
          resolvedTickets: stat ? stat.resolvedTickets : null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  /** The roster after the in-pane search; the header count uses `roster()`. */
  readonly rosterView = computed(() => {
    const term = this.rosterSearch().trim().toLowerCase();
    if (!term) return this.roster();
    return this.roster().filter((entry) =>
      entry.name.toLowerCase().includes(term),
    );
  });

  /** Busiest member of the selected team, so workload bars share one scale. */
  readonly rosterMaxActive = computed(() =>
    Math.max(1, ...this.roster().map((entry) => entry.activeTickets ?? 0)),
  );

  /**
   * Adding a member used to mean pasting an Identity GUID by hand, with no
   * way to discover one from inside the app. Every Agent in the organization
   * is listed by GET /reports/agents, so when that is available the
   * already-joined ones are filtered out and the rest become a real picker.
   */
  readonly addableAgents = computed<AddableMember[]>(() => {
    const joined = new Set(this.currentMembers().map((m) => m.userId));
    // The org member list is what this page is already guarded by, so it is
    // available the moment the page is. The agent directory depends on a
    // separate reports probe that may not have settled yet on a hard refresh,
    // which used to leave "Add agent" missing. Either source is enough.
    const pool = new Map<string, string>(this.agentDirectory.names());
    for (const member of this.orgMembers()) {
      if (member.role === OrganizationRole.Agent) {
        pool.set(member.userId, member.userName);
      }
    }
    return [...pool.entries()]
      .filter(([userId]) => !joined.has(userId))
      .map(([userId, name]) => ({ userId, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly isDirectoryAvailable = computed(
    () =>
      this.agentDirectory.isAvailable() ||
      this.orgMembers().some((m) => m.role === OrganizationRole.Agent),
  );

  /**
   * Managers who could be added to the selected team — GET /organizations/
   * members is the only endpoint that returns a Manager's name (see
   * OrganizationService.getMembers()). Shown only to the Owner: a Manager
   * can never add another Manager (TeamMembershipService.AddMemberAsync
   * rejects it), so the button offering that choice is gated by
   * canAdministerTeams() in the template, not just filtered here.
   */
  readonly addableManagers = computed<AddableMember[]>(() => {
    const joined = new Set(this.currentMembers().map((m) => m.userId));
    return this.orgMembers()
      .filter(
        (member) =>
          member.role === OrganizationRole.Manager &&
          !joined.has(member.userId),
      )
      .map((member) => ({ userId: member.userId, name: member.userName }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly isManagerDirectoryAvailable = computed(
    () => this.orgMembers().length > 0,
  );

  // ---------------------------------------------------------------------
  // People view
  // ---------------------------------------------------------------------

  readonly people = computed<PersonRow[]>(() => {
    const membership = this.memberships();
    const teamsById = new Map(this.teams().map((team) => [team.id, team]));
    const manageable = new Set(this.manageableTeams().map((team) => team.id));
    const stats = this.agentStatsById();

    return this.orgMembers().map((member) => {
      const stat = stats.get(member.userId);
      const teamIds = membership?.get(member.userId);
      return {
        userId: member.userId,
        name: member.userName,
        role: TeamRosterComponent.roleLabel(member.role),
        teams: membership
          ? (teamIds ?? [])
              .map((id) => teamsById.get(id))
              .filter((team): team is TeamDto => !!team)
              .map((team) => ({
                id: team.id,
                name: team.name,
                manageable: manageable.has(team.id),
              }))
              .sort((a, b) => a.name.localeCompare(b.name))
          : null,
        activeTickets: stat ? stat.activeTickets : null,
        resolvedTickets: stat ? stat.resolvedTickets : null,
      };
    });
  });

  readonly roleCounts = computed(() => {
    const all = this.people();
    return {
      all: all.length,
      owner: all.filter((p) => p.role === 'Owner').length,
      manager: all.filter((p) => p.role === 'Manager').length,
      agent: all.filter((p) => p.role === 'Agent').length,
    };
  });

  /** Managers and agents with no team at all. Owners are not expected on teams. */
  readonly unassignedPeople = computed(
    () =>
      this.people().filter(
        (person) =>
          person.role !== 'Owner' &&
          !!person.teams &&
          person.teams.length === 0,
      ).length,
  );

  readonly visiblePeople = computed(() => {
    const term = this.peopleSearch().trim().toLowerCase();
    const role = this.peopleRole();
    const unassignedOnly = this.onlyUnassigned();
    const rank: Record<RoleLabel, number> = { Owner: 0, Manager: 1, Agent: 2 };

    return this.people()
      .filter((person) => role === 'all' || person.role.toLowerCase() === role)
      .filter((person) => !term || person.name.toLowerCase().includes(term))
      .filter(
        (person) =>
          !unassignedOnly ||
          (person.role !== 'Owner' &&
            !!person.teams &&
            person.teams.length === 0),
      )
      .sort(
        (a, b) => rank[a.role] - rank[b.role] || a.name.localeCompare(b.name),
      );
  });

  readonly hasPeopleFilters = computed(
    () =>
      this.peopleSearch().trim().length > 0 ||
      this.peopleRole() !== 'all' ||
      this.onlyUnassigned(),
  );

  constructor() {
    // Keeps the right-pane selection valid whenever the manageable team set
    // changes — on first load, and again once getMyTeamMemberships()
    // resolves and (for a Manager) narrows the list. Deliberately tracks
    // `manageableTeams()`, not the search-filtered `visibleTeams()`, so
    // typing in the search box never steals the current selection.
    effect(() => {
      const list = this.manageableTeams();
      const selectedId = this.selectedTeam()?.id;
      const stillValid = !!selectedId && list.some((t) => t.id === selectedId);

      if (stillValid) return;

      const next = list[0] ?? null;
      if (next) {
        this.onSelectTeam(next);
      } else {
        this.selectedTeam.set(null);
        this.currentMembers.set([]);
      }
    });
  }

  ngOnInit(): void {
    this.agentDirectory.loadIfPermitted();
    this.loadOrgMembers();
    this.loadTeams();
    this.loadStats();
    this.loadAgentStats();
    this.teamService
      .getMyTeamMemberships()
      .subscribe((ids) => this.myTeamIds.set(ids));
  }

  /**
   * Backs the Owner's "Add manager" picker below. This page is already
   * behind managementGuard (Owner or Manager), which matches the
   * CanManageStaff policy on GET /organizations/members, so this call is
   * expected to succeed for every viewer who reaches this component. A
   * failure just falls back to the manual "Add by user ID" entry, the same
   * degrade path agentDirectory already uses.
   */
  loadOrgMembers(): void {
    if (this.membersState() !== 'ready') this.membersState.set('loading');

    this.organizationService
      .getMembers()
      .pipe(
        map((members) => ({ members, ok: true })),
        catchError(() =>
          of({ members: [] as OrganizationMemberDto[], ok: false }),
        ),
      )
      .subscribe(({ members, ok }) => {
        this.orgMembers.set(members);
        this.membersState.set(ok ? 'ready' : 'unavailable');
      });
  }

  /** Header refresh: every widget on the page, each on its own. */
  refresh(): void {
    this.loadOrgMembers();
    this.loadTeams();
    this.loadStats();
    this.loadAgentStats();
  }

  /**
   * Per-team member and ticket counts. A failure only blanks the numbers that
   * depend on it; the team list and roster keep working without them.
   */
  loadStats(): void {
    if (this.statsState() !== 'ready') this.statsState.set('loading');

    this.reportingService.getTeamStatistics({}).subscribe({
      next: (data) => {
        this.teamStats.set(data);
        this.statsState.set('ready');
      },
      error: () => {
        if (this.statsState() !== 'ready') this.statsState.set('unavailable');
      },
    });
  }

  loadAgentStats(): void {
    if (this.agentStatsState() !== 'ready') this.agentStatsState.set('loading');

    this.reportingService.getAgentStatistics({}).subscribe({
      next: (data) => {
        this.agentStats.set(data);
        this.agentStatsState.set('ready');
      },
      error: () => {
        if (this.agentStatsState() !== 'ready') {
          this.agentStatsState.set('unavailable');
        }
      },
    });
  }

  setView(view: 'teams' | 'people'): void {
    this.view.set(view);
    if (view === 'people' && this.membershipState() === 'idle') {
      this.loadMemberships();
    }
  }

  /** One members call per team; all-or-nothing so the chips are never half right. */
  loadMemberships(): void {
    const teams = this.teams();
    if (teams.length === 0) {
      this.memberships.set(new Map());
      this.membershipState.set('ready');
      return;
    }

    this.membershipState.set('loading');
    forkJoin(
      teams.map((team) =>
        this.teamService.getTeamMembers(team.id).pipe(
          map((members) => ({
            teamId: team.id,
            users: members.map((m) => m.userId),
          })),
          catchError(() => of(null)),
        ),
      ),
    ).subscribe((results) => {
      if (results.some((result) => result === null)) {
        this.membershipState.set('failed');
        return;
      }
      const byUser = new Map<string, string[]>();
      for (const result of results) {
        if (!result) continue;
        for (const userId of result.users) {
          byUser.set(userId, [...(byUser.get(userId) ?? []), result.teamId]);
        }
      }
      this.memberships.set(byUser);
      this.membershipState.set('ready');
    });
  }

  /** Membership changed somewhere: drop the cache, refetch if it is on screen. */
  private invalidateMemberships(): void {
    this.memberships.set(null);
    this.membershipState.set('idle');
    if (this.view() === 'people') this.loadMemberships();
  }

  /** A team chip in the People view opens that team on the Teams view. */
  openTeam(teamId: string): void {
    const team = this.manageableTeams().find((t) => t.id === teamId);
    if (!team) return;
    this.view.set('teams');
    this.onSelectTeam(team);
  }

  clearPeopleFilters(): void {
    this.peopleSearch.set('');
    this.peopleRole.set('all');
    this.onlyUnassigned.set(false);
  }

  roleBadge(role: RoleLabel | null): string {
    if (role === 'Owner') return 'sc-badge-primary';
    if (role === 'Manager') return 'sc-badge-info';
    return 'sc-badge-neutral';
  }

  /** Workload bar width for one roster entry, on the team's own scale. */
  loadPercent(entry: RosterEntry): number {
    return entry.activeTickets === null
      ? 0
      : Math.round((entry.activeTickets / this.rosterMaxActive()) * 100);
  }

  /** Moves the Edit action's attention to the form, which may be off screen. */
  focusTeamForm(): void {
    this.teamNameInput()?.nativeElement.focus();
  }

  /**
   * On a stacked (phone/tablet) layout the roster sits below the list, so
   * picking a team scrolls it into view. Side by side, nothing moves.
   */
  revealDetail(pane: HTMLElement): void {
    if (
      typeof matchMedia === 'function' &&
      matchMedia('(min-width: 1280px)').matches
    ) {
      return;
    }
    pane.scrollIntoView({ block: 'start' });
    pane.focus({ preventScroll: true });
  }

  loadTeams(): void {
    this.isTeamLoading.set(true);
    this.errorMessage.set(null);

    this.teamService.getTeams().subscribe({
      next: (data) => {
        this.teams.set(data);
        this.isTeamLoading.set(false);
        this.invalidateMemberships();
        // Selection is kept valid by the constructor's effect, above.
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isTeamLoading.set(false);
      },
    });
  }

  onSelectTeam(team: TeamDto): void {
    this.selectedTeam.set(team);
    this.rosterSearch.set('');
    this.memberForm.reset({ userId: '' });
    this.loadMembers(team.id);
  }

  loadMembers(teamId: string): void {
    this.isMemberLoading.set(true);

    this.teamService
      .getTeamMembers(teamId)
      .pipe(catchError(() => of([])))
      .subscribe((members) => {
        this.currentMembers.set(members);
        this.isMemberLoading.set(false);
      });
  }

  // ---------------------------------------------------------------------
  // Teams
  // ---------------------------------------------------------------------

  onSubmitTeam(): void {
    if (this.teamForm.invalid || this.isSavingTeam()) {
      this.teamForm.markAllAsTouched();
      return;
    }

    const raw = this.teamForm.getRawValue();
    const payload = {
      name: raw.name.trim(),
      description: raw.description.trim() || null,
    };

    const id = this.editingTeamId();
    this.isSavingTeam.set(true);
    this.errorMessage.set(null);

    const request$: Observable<unknown> = id
      ? this.teamService.updateTeam(id, payload)
      : this.teamService.createTeam(payload);

    request$.subscribe({
      next: () => {
        this.toast.success(id ? 'Team updated.' : 'Team created.');
        this.isSavingTeam.set(false);
        this.cancelTeamEdit();
        this.loadTeams();
        this.loadStats();
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.toast.error(err.message);
        this.isSavingTeam.set(false);
      },
    });
  }

  onEditTeam(team: TeamDto): void {
    this.editingTeamId.set(team.id);
    this.teamForm.setValue({
      name: team.name,
      description: team.description ?? '',
    });
  }

  cancelTeamEdit(): void {
    this.editingTeamId.set(null);
    this.teamForm.reset({ name: '', description: '' });
  }

  /**
   * DELETE /teams/{id} maps to TeamService.DeactivateAsync. GET /teams only
   * returns active teams, so a deactivated team leaves this list — but its
   * tickets keep pointing at it, which the confirmation says plainly.
   */
  onDeactivateTeam(team: TeamDto): void {
    this.confirm
      .ask({
        title: `Deactivate ${team.name}?`,
        message:
          'The team stops appearing when routing new tickets and drops off this list. Tickets already assigned to it keep their team.',
        confirmLabel: 'Deactivate',
        tone: 'danger',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.teamService.deleteTeam(team.id).subscribe({
          next: () => {
            this.toast.success(`${team.name} deactivated.`);
            if (this.selectedTeam()?.id === team.id) {
              this.selectedTeam.set(null);
              this.currentMembers.set([]);
            }
            if (this.editingTeamId() === team.id) this.cancelTeamEdit();
            this.loadTeams();
            this.loadStats();
          },
          error: (err: Error) => {
            this.errorMessage.set(err.message);
            this.toast.error(err.message);
          },
        });
      });
  }

  // ---------------------------------------------------------------------
  // Members
  // ---------------------------------------------------------------------

  /** Shared by both the Agent menu and the Manager menu — the request body
   * is just a userId regardless of which list it came from. */
  onPickMember(userId: string): void {
    this.memberForm.setValue({ userId });
    this.onAddMemberSubmit();
  }

  onAddMemberSubmit(): void {
    const team = this.selectedTeam();
    if (this.memberForm.invalid || !team || this.isAddingMember()) {
      this.memberForm.markAllAsTouched();
      return;
    }

    this.isAddingMember.set(true);
    this.errorMessage.set(null);

    this.teamService
      .addTeamMember(team.id, this.memberForm.getRawValue())
      .subscribe({
        next: () => {
          this.toast.success('Member added to the team.');
          this.memberForm.reset({ userId: '' });
          this.isAddingMember.set(false);
          this.loadMembers(team.id);
          this.loadStats();
          this.invalidateMemberships();
        },
        error: (err: Error) => {
          this.errorMessage.set(err.message);
          this.toast.error(err.message);
          this.isAddingMember.set(false);
        },
      });
  }

  onRemoveMember(entry: RosterEntry): void {
    const team = this.selectedTeam();
    if (!team) return;

    this.confirm
      .ask({
        title: 'Remove from this team?',
        message: `${entry.name} will no longer be assignable to ${team.name}'s tickets. Tickets already assigned to them are not reassigned automatically.`,
        confirmLabel: 'Remove',
        tone: 'danger',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.teamService.removeTeamMember(team.id, entry.userId).subscribe({
          next: () => {
            this.toast.success('Member removed.');
            this.loadMembers(team.id);
            this.loadStats();
            this.invalidateMemberships();
          },
          error: (err: Error) => {
            this.errorMessage.set(err.message);
            this.toast.error(err.message);
          },
        });
      });
  }
}
