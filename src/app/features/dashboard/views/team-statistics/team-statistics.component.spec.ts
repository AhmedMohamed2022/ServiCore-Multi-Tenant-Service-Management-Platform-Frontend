import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamStatisticsComponent } from './team-statistics.component';

describe('TeamStatisticsComponent', () => {
  let component: TeamStatisticsComponent;
  let fixture: ComponentFixture<TeamStatisticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamStatisticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamStatisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
