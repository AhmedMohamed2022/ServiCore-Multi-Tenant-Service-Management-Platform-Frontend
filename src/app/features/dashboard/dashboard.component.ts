import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/services/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);

  readonly userEmail = () =>
    this.authService.currentUser()?.email || 'Operator';
}
