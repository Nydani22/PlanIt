import { TestBed } from '@angular/core/testing';

import { GroupstateService } from './groupstate.service';

describe('GroupstateService', () => {
  let service: GroupstateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GroupstateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
