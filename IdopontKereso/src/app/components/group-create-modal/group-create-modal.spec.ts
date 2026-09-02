import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupCreateModalComponent } from './group-create-modal';

describe('GroupCreateModalComponent', () => {
  let component: GroupCreateModalComponent;
  let fixture: ComponentFixture<GroupCreateModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupCreateModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupCreateModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
