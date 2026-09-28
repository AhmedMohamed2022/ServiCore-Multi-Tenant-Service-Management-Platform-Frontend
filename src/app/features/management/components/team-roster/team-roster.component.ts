import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { catchError, Observable, of } from 'rxjs';

import { TeamService } from '../../../../core/services/team.service';
import { AgentDirectoryService } from '../../../../core/services/agent-directory.service';
import { OrganizationService } from '../../../../core/services/organization.service';
import { TeamDto, TeamMemberDto } from '../../models/team.model';
import {
  OrganizationMemberDto,
  OrganizationRole,
} from '../../models/organization.model';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import {
  AlertComponent,
  EmptyStateComponent,
  LoadingStateComponent,
} from '../../../../shared/ui/states/states.component';
import { ConfirmService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

/** A member row with whatever display name we can honestly produce. */
interface RosterEntry {
  readonly userId: string;
  readonly name: string;
  readonly isNamed: boolean;
  readonly joinedAt: string;
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
    LoadingStateComponent,
  ],
  templateUrl: './team-roster.component.html',
  styleUrls: ['./team-roster.component.css'],
})
export class TeamRosterComponent implements OnInit {
  private readonly teamService = inject(TeamService);
  private readonly agentDirectory = inject(AgentDirectoryService);
  private readonly organizationService = inject(OrganizationService);
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

  readonly visibleTeams = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.manageableTeams()
      .filter(
        (team) =>
          !term ||
          team.name.toLowerCase().includes(term) ||
          (team.description ?? '').toLowerCase().includes(term),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  });

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
        return {
          userId: member.userId,
          name: name ?? `Unnamed member · ${member.userId.substring(0, 8)}`,
          isNamed: !!name,
          joinedAt: member.joinedAt,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  /**
   * Adding a member used to mean pasting an Identity GUID by hand, with no
   * way to discover one from inside the app. Every Agent in the organization
   * is listed by GET /reports/agents, so when that is available the
   * already-joined ones are filtered out and the rest become a real picker.
   */
  readonly addableAgents = computed<AddableMember[]>(() => {
    const joined = new Set(this.currentMembers().map((m) => m.userId));
    return [...this.agentDirectory.names().entries()]
      .filter(([userId]) => !joined.has(userId))
      .map(([userId, name]) => ({ userId, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly isDirectoryAvailable = this.agentDirectory.isAvailable;

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
          member.role === OrganizationRole.Manager && !joined.has(member.userId),
      )
      .map((member) => ({ userId: member.userId, name: member.userName }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly isManagerDirectoryAvailable = computed(
    () => this.orgMembers().length > 0,
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
    this.organizationService
      .getMembers()
      .pipe(catchError(() => of([])))
      .subscribe((members) => this.orgMembers.set(members));
  }

  loadTeams(): void {
    this.isTeamLoading.set(true);
    this.errorMessage.set(null);

    this.teamService.getTeams().subscribe({
      next: (data) => {
        this.teams.set(data);
        this.isTeamLoading.set(false);
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
          },
          error: (err: Error) => {
            this.errorMessage.set(err.message);
            this.toast.error(err.message);
          },
        });
      });
  }
}
