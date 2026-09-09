import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaxonomySpecsComponent } from './taxonomy-specs.component';

describe('TaxonomySpecsComponent', () => {
  let component: TaxonomySpecsComponent;
  let fixture: ComponentFixture<TaxonomySpecsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaxonomySpecsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaxonomySpecsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
