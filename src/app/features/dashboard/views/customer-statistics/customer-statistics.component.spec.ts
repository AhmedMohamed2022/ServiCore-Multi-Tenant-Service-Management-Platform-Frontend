import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerStatisticsComponent } from './customer-statistics.component';

describe('CustomerStatisticsComponent', () => {
  let component: CustomerStatisticsComponent;
  let fixture: ComponentFixture<CustomerStatisticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerStatisticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomerStatisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
