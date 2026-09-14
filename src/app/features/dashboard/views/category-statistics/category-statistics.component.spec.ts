import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryStatisticsComponent } from './category-statistics.component';

describe('CategoryStatisticsComponent', () => {
  let component: CategoryStatisticsComponent;
  let fixture: ComponentFixture<CategoryStatisticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryStatisticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoryStatisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
