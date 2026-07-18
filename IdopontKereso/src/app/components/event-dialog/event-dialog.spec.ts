import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventDialogComponent } from './event-dialog';

describe('EventDialog', () => {
  let component: EventDialogComponent;
  let fixture: ComponentFixture<EventDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
