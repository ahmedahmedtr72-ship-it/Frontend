import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfEditorComponent } from './pdf-editor-component';

describe('PdfEditorComponent', () => {
  let component: PdfEditorComponent;
  let fixture: ComponentFixture<PdfEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfEditorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
