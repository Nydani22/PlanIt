import { TestBed } from '@angular/core/testing';

import { CalendarRefreshService } from './calendar-refresh.service';

describe('CalendarRefreshService', () => {
  let service: CalendarRefreshService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CalendarRefreshService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
