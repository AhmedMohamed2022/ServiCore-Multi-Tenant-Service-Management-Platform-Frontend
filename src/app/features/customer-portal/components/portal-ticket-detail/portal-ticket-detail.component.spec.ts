import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PortalTicketDetailComponent } from './portal-ticket-detail.component';

describe('PortalTicketDetailComponent', () => {
  let component: PortalTicketDetailComponent;
  let fixture: ComponentFixture<PortalTicketDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalTicketDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PortalTicketDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
