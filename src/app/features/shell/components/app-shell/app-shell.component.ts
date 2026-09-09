import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { TenantSwitcherComponent } from '../tenant-switcher/tenant-switcher/tenant-switcher.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TenantSwitcherComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.css'],
})
export class AppShellComponent {
  protected readonly authService = inject(AuthService);

  // Derived properties from the authenticated me payload profile
  readonly userEmail = () => this.authService.currentUser()?.email || '';
  readonly userId = () => this.authService.currentUser()?.userId || '';

  onLogoutClick(): void {
    this.authService.logout();
  }
}
