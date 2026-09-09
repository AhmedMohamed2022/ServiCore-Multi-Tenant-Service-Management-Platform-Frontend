import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AcceptCustomerInvitationComponent } from './accept-customer-invitation.component';

describe('AcceptCustomerInvitationComponent', () => {
  let component: AcceptCustomerInvitationComponent;
  let fixture: ComponentFixture<AcceptCustomerInvitationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcceptCustomerInvitationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AcceptCustomerInvitationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
