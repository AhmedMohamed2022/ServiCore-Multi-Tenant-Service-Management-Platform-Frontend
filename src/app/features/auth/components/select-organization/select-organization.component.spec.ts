import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectOrganizationComponent } from './select-organization.component';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';

describe('SelectOrganizationComponent', () => {
  let component: SelectOrganizationComponent;
  let fixture: ComponentFixture<SelectOrganizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: TEST_PROVIDERS,
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
