import { TestBed } from '@angular/core/testing';

import { PackingList } from './packing-list';

describe('PackingList', () => {
  let service: PackingList;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PackingList);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
