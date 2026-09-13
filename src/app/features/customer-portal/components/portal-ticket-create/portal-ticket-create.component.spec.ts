import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PortalTicketCreateComponent } from './portal-ticket-create.component';

describe('PortalTicketCreateComponent', () => {
  let component: PortalTicketCreateComponent;
  let fixture: ComponentFixture<PortalTicketCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalTicketCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PortalTicketCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
