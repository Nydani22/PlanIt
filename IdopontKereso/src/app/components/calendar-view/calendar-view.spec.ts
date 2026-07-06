import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarViewComponent } from './calendar-view';

describe('CalendarView', () => {
  let component: CalendarViewComponent;
  let fixture: ComponentFixture<CalendarViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarViewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
