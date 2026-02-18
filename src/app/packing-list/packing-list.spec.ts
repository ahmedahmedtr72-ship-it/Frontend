import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PackingList } from './packing-list';

describe('PackingList', () => {
  let component: PackingList;
  let fixture: ComponentFixture<PackingList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PackingList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PackingList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
