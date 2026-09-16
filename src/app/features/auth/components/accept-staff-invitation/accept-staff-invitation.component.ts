import { Component, inject, OnInit, signal, Input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { PasswordFieldComponent } from '../shared/password-field.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { AlertComponent } from '../../../../shared/ui/states/states.component';

@Component({
  selector: 'app-accept-staff-invitation',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthLayoutComponent,
    PasswordFieldComponent,
    IconComponent,
    AlertComponent,
  ],
  templateUrl: './accept-staff-invitation.component.html',
})
export class AcceptStaffInvitationComponent implements OnInit {
  @Input() token!: string; // Bound automatically from query string '?token=...' via router bindings

  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly isProcessing = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly setupForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit(): void {
    if (!this.token) {
      this.errorMessage.set(
        'This invitation link is missing its token. Ask whoever invited you to send a fresh link.',
      );
    }
  }

  onCompleteStaffOnboarding(): void {
    if (this.setupForm.invalid || !this.token) return;

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    const payload = {
      token: this.token,
      password: this.setupForm.getRawValue().password,
    };

    this.http
      .post(
        `${environment.apiBaseUrl}/organization/invitations/accept`,
        payload,
      )
      .subscribe({
        next: () => {
          this.isProcessing.set(false);
          this.successMessage.set(
            'Your account is ready. Taking you to sign in.',
          );
          setTimeout(() => this.router.navigate(['/login']), 2500);
        },
        error: (err) => {
          this.errorMessage.set(
            err.error?.error ||
              'We could not complete your setup. The invitation may have expired.',
          );
          this.isProcessing.set(false);
        },
      });
  }
}
