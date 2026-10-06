import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PortalTicketDetailComponent } from './portal-ticket-detail.component';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';

describe('PortalTicketDetailComponent', () => {
  let component: PortalTicketDetailComponent;
  let fixture: ComponentFixture<PortalTicketDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: TEST_PROVIDERS,
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
