import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupCreateModal } from './group-create-modal';

describe('GroupCreateModal', () => {
  let component: GroupCreateModal;
  let fixture: ComponentFixture<GroupCreateModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupCreateModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupCreateModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
