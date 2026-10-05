import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportSkeletonComponent } from './report-skeleton.component';

describe('ReportSkeletonComponent', () => {
  let component: ReportSkeletonComponent;
  let fixture: ComponentFixture<ReportSkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportSkeletonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportSkeletonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
