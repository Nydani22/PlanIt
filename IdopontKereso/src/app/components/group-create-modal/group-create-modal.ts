import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GroupService } from '../../services/group/group.service';
import { Group } from '../../models/group.model';
import { InviteDialogComponent } from '../invite-dialog/invite-dialog';
import { SnackbarService } from '../../services/snackbar/snackbar.service';

export interface GroupDialogData {
  group?: Group; 
}

@Component({
  selector: 'app-group-create-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './group-create-modal.html',
  styleUrl: './group-create-modal.scss'
})
export class GroupCreateModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private groupService = inject(GroupService);
  private dialogRef = inject(MatDialogRef<GroupCreateModalComponent>);
  private dialog = inject(MatDialog); 
  private snackbarService = inject(SnackbarService);
  
  public data = inject<GroupDialogData>(MAT_DIALOG_DATA, { optional: true });

  basicFormGroup: FormGroup = this.fb.group({
    groupName: ['', [Validators.required, Validators.minLength(3)]]
  });

  detailsFormGroup: FormGroup = this.fb.group({
    description: ['']
  });

  isSubmitting = signal<boolean>(false);
  isEditMode = signal<boolean>(false);

  ngOnInit() {
    if (this.data && this.data.group) {
      this.isEditMode.set(true);
      this.basicFormGroup.patchValue({
        groupName: this.data.group.groupName
      });
      this.detailsFormGroup.patchValue({
        description: this.data.group.description || ''
      });
    }
  }

  onSubmit() {
    if (this.basicFormGroup.invalid) return;

    this.isSubmitting.set(true); 
    
    const groupData: Partial<Group> = {
      groupName: this.basicFormGroup.value.groupName,
      description: this.detailsFormGroup.value.description
    };

    if (this.isEditMode() && this.data?.group?._id) {
      this.groupService.updateGroup(this.data.group._id, groupData).subscribe({
        next: (updatedGroup) => {
          this.isSubmitting.set(false);
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.snackbarService.showError('Hiba a csoport frissítésekor.');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.groupService.createGroup(groupData).subscribe({
        next: (createdGroup) => {
          this.groupService.generateInvite(createdGroup._id!).subscribe({
            next: (response) => {
              this.isSubmitting.set(false);
              const generatedUrl = `${window.location.origin}/join/${response.token}`;
              
              this.dialogRef.close(true);

              this.dialog.open(InviteDialogComponent, {
                width: '450px',
                maxWidth: '90vw',
                disableClose: false,
                data: { 
                  inviteUrl: generatedUrl,
                  groupName: createdGroup.groupName 
                }
              });
            },
            error: (inviteErr) => {
              this.snackbarService.showError('Hiba a token generálásakor.');
              this.isSubmitting.set(false);
              this.dialogRef.close(true);
            }
          });
        },
        error: (err) => {
          this.snackbarService.showError('Hiba a csoport létrehozásakor.');
          this.isSubmitting.set(false);
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}