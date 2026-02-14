import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecentGeneratedPdf } from './recent-generated-pdf';

describe('RecentGeneratedPdf', () => {
  let component: RecentGeneratedPdf;
  let fixture: ComponentFixture<RecentGeneratedPdf>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentGeneratedPdf]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecentGeneratedPdf);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
