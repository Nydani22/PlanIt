import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InviteDialogComponent } from './invite-dialog';

describe('InviteDialogComponent', () => {
  let component: InviteDialogComponent;
  let fixture: ComponentFixture<InviteDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InviteDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InviteDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
