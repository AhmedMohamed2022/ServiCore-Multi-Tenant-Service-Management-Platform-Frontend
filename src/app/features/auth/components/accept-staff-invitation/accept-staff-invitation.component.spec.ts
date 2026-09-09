import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AcceptStaffInvitationComponent } from './accept-staff-invitation.component';

describe('AcceptStaffInvitationComponent', () => {
  let component: AcceptStaffInvitationComponent;
  let fixture: ComponentFixture<AcceptStaffInvitationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcceptStaffInvitationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AcceptStaffInvitationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
