import { TestBed } from '@angular/core/testing';

import { CategoryService } from './category.service';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: TEST_PROVIDERS});
    service = TestBed.inject(CategoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
