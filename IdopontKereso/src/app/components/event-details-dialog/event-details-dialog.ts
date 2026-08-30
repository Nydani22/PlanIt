import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { AppEvent, Attendee } from '../../models/event.model';
import { User } from '../../models/user.model';
import { Group } from '../../models/group.model';

export interface EventDetailsData {
  event: AppEvent;
  canEdit: boolean;
}

@Component({
  selector: 'app-event-details-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './event-details-dialog.html',
  styleUrl: './event-details-dialog.scss',
})
export class EventDetailsDialog {
  dialogRef = inject(MatDialogRef<EventDetailsDialog>);
  data = inject<EventDetailsData>(MAT_DIALOG_DATA);

  get event(): AppEvent { return this.data.event; }
  get canEdit(): boolean { return this.data.canEdit; }

  openEdit() {
    this.dialogRef.close('edit');
  }

  getAttendeeName(attendee: Attendee): string {
    const user = attendee.userId as string | User;
    
    if (typeof user === 'object' && user !== null) {
      return user.fullName || user.userName || 'Ismeretlen résztvevő';
    }

    const group = this.event.groupId as string | Group | undefined;
    
    if (group && typeof group === 'object' && Array.isArray(group.members)) {
      const member = group.members.find(m => {
        const mUser = m.userId as string | User;
        const mUserId = typeof mUser === 'object' && mUser !== null 
          ? mUser._id 
          : mUser;
          
        return mUserId === user;
      });

      if (member && typeof member.userId === 'object' && member.userId !== null) {
        return member.userId.fullName || member.userId.userName || 'Ismeretlen résztvevő';
      }
    }

    return 'Meghívott tag';
  }
}
