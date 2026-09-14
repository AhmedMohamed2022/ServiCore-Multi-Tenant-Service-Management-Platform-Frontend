import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { OrganizationSummary } from '../../../../core/auth/models/auth.models';

@Component({
  selector: 'app-select-organization',
  standalone: true,
  templateUrl: './select-organization.component.html',
  styleUrl: './select-organization.component.css',
})
export class SelectOrganizationComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly organizations = this.authService.availableOrganizations;

  readonly isSelecting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  selectOrganization(organization: OrganizationSummary): void {
    if (this.isSelecting()) {
      return;
    }

    this.errorMessage.set(null);
    this.isSelecting.set(true);

    this.authService.selectOrganization(organization.id);
  }

  logout(): void {
    this.authService.logout();
  }
}
