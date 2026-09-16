import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { OrganizationSummary } from '../../../../core/auth/models/auth.models';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import {
  AlertComponent,
  EmptyStateComponent,
} from '../../../../shared/ui/states/states.component';

@Component({
  selector: 'app-select-organization',
  standalone: true,
  imports: [
    AuthLayoutComponent,
    IconComponent,
    AvatarComponent,
    AlertComponent,
    EmptyStateComponent,
  ],
  templateUrl: './select-organization.component.html',
})
export class SelectOrganizationComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly organizations = this.authService.availableOrganizations;

  readonly isSelecting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  /** Tracks which card was clicked, so only that one shows a busy state. */
  readonly pendingId = signal<string | null>(null);

  selectOrganization(organization: OrganizationSummary): void {
    if (this.isSelecting()) {
      return;
    }

    this.errorMessage.set(null);
    this.isSelecting.set(true);
    this.pendingId.set(organization.id);

    this.authService.selectOrganization(organization.id);
  }

  logout(): void {
    this.authService.logout();
  }
}
