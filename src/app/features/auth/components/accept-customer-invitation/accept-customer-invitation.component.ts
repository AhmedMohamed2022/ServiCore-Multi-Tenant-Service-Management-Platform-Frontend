import { Component, inject, OnInit, signal, Input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { PasswordFieldComponent } from '../shared/password-field.component';
import { passwordPolicyValidator } from '../shared/password.validators';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { AlertComponent } from '../../../../shared/ui/states/states.component';
import { InvitationService } from '../../../../core/services/invitation.service';

@Component({
  selector: 'app-accept-customer-invitation',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthLayoutComponent,
    PasswordFieldComponent,
    IconComponent,
    AlertComponent,
  ],
  templateUrl: './accept-customer-invitation.component.html',
})
export class AcceptCustomerInvitationComponent implements OnInit {
  @Input() token!: string;

  private readonly invitations = inject(InvitationService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly isLoadingPreview = signal<boolean>(false);
  readonly isProcessing = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  /** True when the invited email already has an account (no password to set). */
  readonly userExists = signal<boolean>(false);
  readonly inviteeEmail = signal<string | null>(null);
  /** True when the token is invalid/expired/revoked, so no form is shown. */
  readonly inviteUnusable = signal<boolean>(false);

  readonly setupForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, passwordPolicyValidator]],
  });

  ngOnInit(): void {
    if (!this.token) {
      this.errorMessage.set(
        'This invitation link is missing its token. Ask your service provider to send a fresh link.',
      );
      return;
    }

    this.isLoadingPreview.set(true);

    this.invitations.previewCustomerInvitation(this.token).subscribe({
      next: (preview) => {
        this.inviteeEmail.set(preview.email);
        this.setUserExists(preview.userExists);
        this.isLoadingPreview.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoadingPreview.set(false);

        // 4xx means the invitation itself is dead (invalid, expired, revoked,
        // already used). Anything else (network blip, 5xx) falls back to the
        // normal password form so a temporary failure never blocks sign-up.
        if (err.status >= 400 && err.status < 500) {
          this.inviteUnusable.set(true);
          this.errorMessage.set(
            err.error?.error ||
              'This invitation is no longer valid. Ask your service provider for a fresh link.',
          );
        }
      },
    });
  }

  private setUserExists(exists: boolean): void {
    this.userExists.set(exists);

    const password = this.setupForm.controls.password;
    if (exists) {
      // Existing accounts keep their current password, so don't collect one.
      password.clearValidators();
    } else {
      password.setValidators([Validators.required, passwordPolicyValidator]);
    }
    password.updateValueAndValidity();
  }

  onCompleteCustomerOnboarding(): void {
    if (this.setupForm.invalid || !this.token) return;

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    const password = this.userExists()
      ? undefined
      : this.setupForm.getRawValue().password;

    this.invitations.acceptCustomerInvitation(this.token, password).subscribe({
      next: (res) => {
        const existing = this.userExists() || res.existingAccount;
        this.isProcessing.set(false);
        this.successMessage.set(
          existing
            ? 'Your portal access is ready. Taking you to sign in. Use your existing password.'
            : 'Your portal account is ready. Taking you to sign in.',
        );
        setTimeout(
          () =>
            this.router.navigate(
              ['/login'],
              existing && this.inviteeEmail()
                ? { queryParams: { email: this.inviteeEmail() } }
                : {},
            ),
          2500,
        );
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          err.error?.error ||
            'We could not activate your account. The invitation may have expired.',
        );
        this.isProcessing.set(false);
      },
    });
  }
}
