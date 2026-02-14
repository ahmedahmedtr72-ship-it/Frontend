import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TakeDmData } from './take-dm-data';

describe('TakeDmData', () => {
  let component: TakeDmData;
  let fixture: ComponentFixture<TakeDmData>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TakeDmData]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TakeDmData);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
