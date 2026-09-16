import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
import { TeamDto, TeamMemberDto } from '../../models/team.model';

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

/** An agent who could be added to the selected team. */
interface AddableAgent {
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
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly teams = signal<TeamDto[]>([]);
  readonly currentMembers = signal<TeamMemberDto[]>([]);
  readonly selectedTeam = signal<TeamDto | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isTeamLoading = signal<boolean>(false);
  readonly isMemberLoading = signal<boolean>(false);
  readonly isSavingTeam = signal<boolean>(false);
  readonly isAddingMember = signal<boolean>(false);
  readonly editingTeamId = signal<string | null>(null);

  readonly searchTerm = signal<string>('');

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

  readonly visibleTeams = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.teams()
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
   * names. AgentDirectoryService supplies names where it can; where it
   * cannot, the row shows an abbreviated id and says so, rather than
   * rendering an empty string.
   */
  readonly roster = computed<RosterEntry[]>(() =>
    this.currentMembers()
      .map((member) => {
        const name = this.agentDirectory.nameFor(member.userId);
        return {
          userId: member.userId,
          name: name ?? `Unnamed member · ${member.userId.substring(0, 8)}`,
          isNamed: !!name,
          joinedAt: member.joinedAt,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  /**
   * Adding a member used to mean pasting an Identity GUID by hand, with no
   * way to discover one from inside the app. Every Agent in the organization
   * is listed by GET /reports/agents, so when that is available the
   * already-joined ones are filtered out and the rest become a real picker.
   */
  readonly addableAgents = computed<AddableAgent[]>(() => {
    const joined = new Set(this.currentMembers().map((m) => m.userId));
    return [...this.agentDirectory.names().entries()]
      .filter(([userId]) => !joined.has(userId))
      .map(([userId, name]) => ({ userId, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly isDirectoryAvailable = this.agentDirectory.isAvailable;

  ngOnInit(): void {
    this.agentDirectory.loadIfPermitted();
    this.loadTeams();
  }

  loadTeams(): void {
    this.isTeamLoading.set(true);
    this.errorMessage.set(null);

    this.teamService.getTeams().subscribe({
      next: (data) => {
        this.teams.set(data);
        this.isTeamLoading.set(false);

        // Keep the current selection across a reload, and otherwise open the
        // first team so the right pane is never a blank slab.
        const selectedId = this.selectedTeam()?.id;
        const next =
          data.find((team) => team.id === selectedId) ?? data[0] ?? null;

        if (next && next.id !== selectedId) {
          this.onSelectTeam(next);
        } else if (next) {
          this.selectedTeam.set(next);
        } else {
          this.selectedTeam.set(null);
          this.currentMembers.set([]);
        }
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

  onPickAgent(userId: string): void {
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
