import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectOrganizationComponent } from './select-organization.component';

describe('SelectOrganizationComponent', () => {
  let component: SelectOrganizationComponent;
  let fixture: ComponentFixture<SelectOrganizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectOrganizationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectOrganizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
