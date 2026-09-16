import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { NotificationTrayComponent } from '../../../shell/components/notification-tray/notification-tray.component';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';

/**
 * The customer portal shares ServiCore's design system but deliberately not
 * its staff layout (§15). Customers get a light, top-bar-led page with two
 * destinations rather than a dark operational sidebar — there is nothing here
 * to justify the density of the staff shell.
 */
@Component({
  selector: 'app-portal-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatMenuModule,
    NotificationTrayComponent,
    AvatarComponent,
    IconComponent,
  ],
  templateUrl: './portal-shell.component.html',
  styleUrls: ['./portal-shell.component.css'],
})
export class PortalShellComponent {
  protected readonly authService = inject(AuthService);

  readonly customerEmail = computed(
    () => this.authService.currentUser()?.email ?? '',
  );

  onLogout(): void {
    this.authService.logout();
  }
}
