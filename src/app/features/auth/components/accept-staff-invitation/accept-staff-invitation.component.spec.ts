import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { AcceptStaffInvitationComponent } from './accept-staff-invitation.component';

describe('AcceptStaffInvitationComponent', () => {
  let component: AcceptStaffInvitationComponent;
  let fixture: ComponentFixture<AcceptStaffInvitationComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcceptStaffInvitationComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AcceptStaffInvitationComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => http.verify());

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('asks for a new password when the invited email has no account', () => {
    fixture.componentRef.setInput('token', 'tok');
    fixture.detectChanges();

    http
      .expectOne((r) => r.url.endsWith('organization/invitations/preview'))
      .flush({ email: 'new@example.com', role: 'Agent', userExists: false });

    expect(component.userExists()).toBe(false);
    expect(component.setupForm.valid).toBe(false); // password still required
  });

  it('does not ask for a password when the invited email already has an account', () => {
    fixture.componentRef.setInput('token', 'tok');
    fixture.detectChanges();

    http
      .expectOne((r) => r.url.endsWith('organization/invitations/preview'))
      .flush({ email: 'old@example.com', role: 'Agent', userExists: true });

    expect(component.userExists()).toBe(true);
    expect(component.inviteeEmail()).toBe('old@example.com');
    expect(component.setupForm.valid).toBe(true);

    component.onCompleteStaffOnboarding();

    const accept = http.expectOne((r) => r.url.endsWith('organization/invitations/accept'));
    expect(accept.request.body).toEqual({ token: 'tok' }); // no password sent
    accept.flush({ message: 'ok', existingAccount: true });
  });

  it('hides the form when the invitation is no longer usable', () => {
    fixture.componentRef.setInput('token', 'tok');
    fixture.detectChanges();

    http
      .expectOne((r) => r.url.endsWith('organization/invitations/preview'))
      .flush(
        { error: 'Invitation is no longer usable.' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(component.inviteUnusable()).toBe(true);
    expect(component.errorMessage()).toBe('Invitation is no longer usable.');
  });
});
