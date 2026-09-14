import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgentStatisticsComponent } from './agent-statistics.component';

describe('AgentStatisticsComponent', () => {
  let component: AgentStatisticsComponent;
  let fixture: ComponentFixture<AgentStatisticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentStatisticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgentStatisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
