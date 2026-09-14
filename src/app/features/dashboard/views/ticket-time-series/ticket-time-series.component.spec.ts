import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketTimeSeriesComponent } from './ticket-time-series.component';

describe('TicketTimeSeriesComponent', () => {
  let component: TicketTimeSeriesComponent;
  let fixture: ComponentFixture<TicketTimeSeriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketTimeSeriesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketTimeSeriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
