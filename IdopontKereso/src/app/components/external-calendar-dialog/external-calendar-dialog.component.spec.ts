import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExternalCalendarDialogComponent } from './external-calendar-dialog.component';

describe('ExternalCalendarDialogComponent', () => {
  let component: ExternalCalendarDialogComponent;
  let fixture: ComponentFixture<ExternalCalendarDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExternalCalendarDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExternalCalendarDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
