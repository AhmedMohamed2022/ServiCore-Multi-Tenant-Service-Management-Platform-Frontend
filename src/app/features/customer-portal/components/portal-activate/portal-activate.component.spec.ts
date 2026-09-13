import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PortalActivateComponent } from './portal-activate.component';

describe('PortalActivateComponent', () => {
  let component: PortalActivateComponent;
  let fixture: ComponentFixture<PortalActivateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalActivateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PortalActivateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
