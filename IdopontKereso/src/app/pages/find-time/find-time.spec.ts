import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FindTime } from './find-time';

describe('FindTime', () => {
  let component: FindTime;
  let fixture: ComponentFixture<FindTime>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FindTime]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FindTime);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
