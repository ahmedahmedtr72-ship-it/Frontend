import { TestBed } from '@angular/core/testing';

import { Pack } from './pack';

describe('Pack', () => {
  let service: Pack;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Pack);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
