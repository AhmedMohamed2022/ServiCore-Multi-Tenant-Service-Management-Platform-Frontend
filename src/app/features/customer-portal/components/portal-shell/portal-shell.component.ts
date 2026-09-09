import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-portal-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './portal-shell.component.html',
  styleUrls: ['./portal-shell.component.css'],
})
export class PortalShellComponent {
  protected readonly authService = inject(AuthService);

  readonly customerEmail = () => this.authService.currentUser()?.email || '';

  onLogout(): void {
    this.authService.logout();
  }
}
