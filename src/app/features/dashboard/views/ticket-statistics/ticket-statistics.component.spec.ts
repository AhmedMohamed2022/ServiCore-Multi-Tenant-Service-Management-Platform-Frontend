import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketStatisticsComponent } from './ticket-statistics.component';

describe('TicketStatisticsComponent', () => {
  let component: TicketStatisticsComponent;
  let fixture: ComponentFixture<TicketStatisticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketStatisticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketStatisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
