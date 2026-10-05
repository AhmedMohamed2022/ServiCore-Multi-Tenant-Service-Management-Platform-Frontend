import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeltaChipComponent } from './delta-chip.component';

describe('DeltaChipComponent', () => {
  let component: DeltaChipComponent;
  let fixture: ComponentFixture<DeltaChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeltaChipComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeltaChipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
