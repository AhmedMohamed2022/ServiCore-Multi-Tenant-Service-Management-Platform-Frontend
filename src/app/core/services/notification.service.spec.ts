import { TestBed } from '@angular/core/testing';

import { NotificationService } from './notification.service';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: TEST_PROVIDERS});
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
