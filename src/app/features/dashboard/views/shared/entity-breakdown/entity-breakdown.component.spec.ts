import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntityBreakdownComponent } from './entity-breakdown.component';

describe('EntityBreakdownComponent', () => {
  let component: EntityBreakdownComponent;
  let fixture: ComponentFixture<EntityBreakdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityBreakdownComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EntityBreakdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
