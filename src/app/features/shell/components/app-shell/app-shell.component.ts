import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { InvitationService } from '../../../../core/services/invitation.service';
import { TenantSwitcherComponent } from '../tenant-switcher/tenant-switcher/tenant-switcher.component';
import { NotificationTrayComponent } from '../notification-tray/notification-tray.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TenantSwitcherComponent,
    NotificationTrayComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.css'],
})
export class AppShellComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly invitationService = inject(InvitationService);

  readonly userEmail = () => this.authService.currentUser()?.email || '';
  readonly userId = () => this.authService.currentUser()?.userId || '';

  // There is no "roles" field on the user anywhere in the backend — role is
  // purely a per-organization membership fact. Rather than guessing at it
  // client-side, ask the server directly using an endpoint it already gates
  // with exactly the policy we care about (Owner + Manager only): a 200
  // response means we're allowed, a 403 means we're not.
  readonly isManagementAllowed = signal<boolean>(false);

  ngOnInit(): void {
    this.invitationService.getInvitations().subscribe({
      next: () => this.isManagementAllowed.set(true),
      error: () => this.isManagementAllowed.set(false),
    });
  }

  onLogoutClick(): void {
    this.authService.logout();
  }
}
