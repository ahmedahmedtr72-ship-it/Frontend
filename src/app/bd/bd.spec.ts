import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Bd } from './bd';

describe('Bd', () => {
  let component: Bd;
  let fixture: ComponentFixture<Bd>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Bd]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Bd);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
