import { Component, inject, OnInit, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-accept-staff-invitation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './accept-staff-invitation.component.html',
  styleUrls: ['./accept-staff-invitation.component.css'],
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
        'Missing or expired critical security onboarding verification token parameter link.',
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
            'Staff identity workspace configurations committed safely.',
          );
          setTimeout(() => this.router.navigate(['/login']), 2500);
        },
        error: (err) => {
          this.errorMessage.set(
            err.error?.error ||
              'Failed to complete registration onboarding setup.',
          );
          this.isProcessing.set(false);
        },
      });
  }
}
