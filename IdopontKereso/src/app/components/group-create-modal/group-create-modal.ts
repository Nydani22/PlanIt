import { Component, inject, signal } from '@angular/core'; // <-- signal importálva
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GroupService } from '../../services/group/group.service';
import { Group } from '../../models/group.model';

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

  basicFormGroup: FormGroup = this.fb.group({
    groupName: ['', [Validators.required, Validators.minLength(3)]]
  });

  detailsFormGroup: FormGroup = this.fb.group({
    description: ['']
  });

  // --- Változók helyett Szignálok ---
  isSubmitting = signal<boolean>(false);
  isCreated = signal<boolean>(false);
  inviteUrl = signal<string>('');
  
  createdGroupData: any = null; // Ez maradhat sima változó, mert a HTML nem használja közvetlenül

  onSubmit() {
    if (this.basicFormGroup.invalid) return;

    this.isSubmitting.set(true); // .set() használata
    
    const newGroupData: Partial<Group> = {
      groupName: this.basicFormGroup.value.groupName,
      description: this.detailsFormGroup.value.description
    };

    this.groupService.createGroup(newGroupData).subscribe({
      next: (createdGroup) => {
        this.isSubmitting.set(false);
        this.createdGroupData = createdGroup;
        
        // Előbb a linket állítjuk be, aztán váltjuk a nézetet
        this.inviteUrl.set(`${window.location.origin}/join/${createdGroup._id}`);
        this.isCreated.set(true);
      },
      error: (err) => {
        console.error('Hiba a létrehozáskor:', err);
        this.isSubmitting.set(false);
      }
    });
  }

  copyInviteLink() {
    if (!this.inviteUrl()) return; // () használata kiolvasáskor
    navigator.clipboard.writeText(this.inviteUrl()).then(() => {
      alert('Meghívó link sikeresen másolva!');
    }).catch(err => console.error('Hiba a másoláskor', err));
  }

  onCloseSuccess() {
    this.dialogRef.close(this.createdGroupData);
  }

  onCancel() {
    this.dialogRef.close();
  }
}