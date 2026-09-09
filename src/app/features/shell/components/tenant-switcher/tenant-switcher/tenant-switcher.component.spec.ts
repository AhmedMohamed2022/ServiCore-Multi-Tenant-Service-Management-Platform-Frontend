import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantSwitcherComponent } from './tenant-switcher.component';

describe('TenantSwitcherComponent', () => {
  let component: TenantSwitcherComponent;
  let fixture: ComponentFixture<TenantSwitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantSwitcherComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TenantSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
