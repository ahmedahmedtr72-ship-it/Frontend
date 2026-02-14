import { TestBed } from '@angular/core/testing';

import { ProductAdded } from './product-added';

describe('ProductAdded', () => {
  let service: ProductAdded;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductAdded);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
