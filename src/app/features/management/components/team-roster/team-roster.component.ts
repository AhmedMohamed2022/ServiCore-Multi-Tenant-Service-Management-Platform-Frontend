import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TeamService } from '../../../../core/services/team.service';
import { TeamDto, TeamMemberDto } from '../../models/team.model';

@Component({
  selector: 'app-team-roster',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './team-roster.component.html',
  styleUrls: ['./team-roster.component.css'],
})
export class TeamRosterComponent implements OnInit {
  private readonly teamService = inject(TeamService);
  private readonly fb = inject(FormBuilder);

  // Structural Signals tracking state data trees
  readonly teams = signal<TeamDto[]>([]);
  readonly currentMembers = signal<TeamMemberDto[]>([]);
  readonly selectedTeam = signal<TeamDto | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isTeamLoading = signal<boolean>(false);
  readonly isMemberLoading = signal<boolean>(false);

  // Operational Form Controls
  readonly teamForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
  });

  readonly memberForm = this.fb.nonNullable.group({
    userId: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadTeams();
  }

  loadTeams(): void {
    this.isTeamLoading.set(true);
    this.teamService.getTeams().subscribe({
      next: (data) => {
        this.teams.set(data);
        this.isTeamLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isTeamLoading.set(false);
      },
    });
  }

  onSelectTeam(team: TeamDto): void {
    this.selectedTeam.set(team);
    this.loadMembers(team.id);
  }

  loadMembers(teamId: string): void {
    this.isMemberLoading.set(true);
    this.teamService.getTeamMembers(teamId).subscribe({
      next: (members) => {
        this.currentMembers.set(members);
        this.isMemberLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isMemberLoading.set(false);
      },
    });
  }

  onCreateTeamSubmit(): void {
    if (this.teamForm.invalid) return;

    this.teamService.createTeam(this.teamForm.getRawValue()).subscribe({
      next: () => {
        this.teamForm.reset();
        this.loadTeams();
      },
      error: (err: Error) => this.errorMessage.set(err.message),
    });
  }

  onAddMemberSubmit(): void {
    const team = this.selectedTeam();
    if (this.memberForm.invalid || !team) return;

    this.teamService
      .addTeamMember(team.id, this.memberForm.getRawValue())
      .subscribe({
        next: () => {
          this.memberForm.reset();
          this.loadMembers(team.id);
        },
        error: (err: Error) => this.errorMessage.set(err.message),
      });
  }

  onRemoveMember(userId: string): void {
    const team = this.selectedTeam();
    if (!team) return;

    if (
      confirm(
        'Are you sure you want to remove this member from the team layout workspace?',
      )
    ) {
      this.teamService.removeTeamMember(team.id, userId).subscribe({
        next: () => this.loadMembers(team.id),
        error: (err: Error) => this.errorMessage.set(err.message),
      });
    }
  }
}
