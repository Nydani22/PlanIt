import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog'; // <-- MatDialog importálva
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GroupService } from '../../services/group/group.service';
import { Group } from '../../models/group.model';
import { InviteDialogComponent } from '../invite-dialog/invite-dialog';

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
export class GroupCreateModalComponent {
  private fb = inject(FormBuilder);
  private groupService = inject(GroupService);
  private dialogRef = inject(MatDialogRef<GroupCreateModalComponent>);
  
  private dialog = inject(MatDialog); 

  basicFormGroup: FormGroup = this.fb.group({
    groupName: ['', [Validators.required, Validators.minLength(3)]]
  });

  detailsFormGroup: FormGroup = this.fb.group({
    description: ['']
  });

  isSubmitting = signal<boolean>(false);

  onSubmit() {
    if (this.basicFormGroup.invalid) return;

    this.isSubmitting.set(true); 
    
    const newGroupData: Partial<Group> = {
      groupName: this.basicFormGroup.value.groupName,
      description: this.detailsFormGroup.value.description
    };

    this.groupService.createGroup(newGroupData).subscribe({
      next: (createdGroup) => {
        this.groupService.generateInvite(createdGroup._id!).subscribe({
          next: (response) => {
            this.isSubmitting.set(false);
            const generatedUrl = `${window.location.origin}/join/${response.token}`;
            
            this.dialogRef.close(true);

            this.dialog.open(InviteDialogComponent, {
              width: '450px',
              disableClose: false,
              data: { 
                inviteUrl: generatedUrl,
                groupName: createdGroup.groupName 
              }
            });
          },
          error: (inviteErr) => {
            console.error('Hiba a token generálásakor:', inviteErr);
            this.isSubmitting.set(false);
            this.dialogRef.close(true);
            alert('A csoport létrejött, de a meghívó linket nem sikerült automatikusan legenerálni. Később a csoport beállításainál pótolhatod!');
          }
        });
      },
      error: (err) => {
        console.error('Hiba a csoport létrehozásakor:', err);
        this.isSubmitting.set(false);
      }
    });
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}