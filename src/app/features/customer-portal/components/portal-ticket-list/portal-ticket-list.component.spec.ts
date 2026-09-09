import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PortalTicketListComponent } from './portal-ticket-list.component';

describe('PortalTicketListComponent', () => {
  let component: PortalTicketListComponent;
  let fixture: ComponentFixture<PortalTicketListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalTicketListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PortalTicketListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
