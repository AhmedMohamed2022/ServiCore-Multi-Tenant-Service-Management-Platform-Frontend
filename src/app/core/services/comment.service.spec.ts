import { TestBed } from '@angular/core/testing';

import { CommentService } from './comment.service';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('CommentService', () => {
  let service: CommentService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: TEST_PROVIDERS});
    service = TestBed.inject(CommentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
