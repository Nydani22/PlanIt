import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiReviewDialogComponent } from './ai-review-dialog';

describe('AiReviewDialogComponent', () => {
  let component: AiReviewDialogComponent;
  let fixture: ComponentFixture<AiReviewDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiReviewDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiReviewDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
