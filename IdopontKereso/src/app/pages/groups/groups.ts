import { Component, OnInit, inject, signal } from '@angular/core'; // ChangeDetectorRef kikerült, signal bejött
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../services/group/group.service';
import { AuthService } from '../../services/auth/auth.service';
import { Group, GroupMember } from '../../models/group.model';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { GroupCreateModalComponent } from '../../components/group-create-modal/group-create-modal';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatSelectModule, 
    MatDividerModule,
    FormsModule,
    MatDialogModule
  ],
  templateUrl: './groups.html',
  styleUrl: './groups.scss',
})
export class Groups implements OnInit {
  private router = inject(Router);
  private groupService = inject(GroupService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);

  myGroups = signal<Group[]>([]);
  selectedGroupId = signal<string>('');
  group = signal<Group | null>(null);
  isAdmin = signal<boolean>(false);
  isLoading = signal<boolean>(true);

  currentUserId: string = ''; 

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId(); 
    this.loadAllGroups();
  }

  loadAllGroups() {
    this.isLoading.set(true);
    this.groupService.getGroups().subscribe({
      next: (data) => {
        this.myGroups.set(data);
        this.isLoading.set(false);
        
        if (this.myGroups().length > 0) {
          this.onGroupSelect(this.myGroups()[0]._id);
        }
      },
      error: (err) => {
        console.error('Hiba a csoportok lekérésekor', err);
        this.isLoading.set(false);
      }
    });
  }

  isOwner(): boolean {
    const currentGroup = this.group();
    if (!currentGroup || !this.currentUserId) return false;
    
    const me = currentGroup.members.find(m => m.userId._id === this.currentUserId);
    return me?.role === 'OWNER';
  }

  onGroupSelect(groupId: string) {
    this.selectedGroupId.set(groupId);
    this.loadGroupDetails(groupId);
  }

  copyInviteLink() {
    const groupId = this.selectedGroupId();
    if (!groupId) return;
    const inviteUrl = `${window.location.origin}/join/${groupId}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      alert(`Meghívó link sikeresen másolva!\n${inviteUrl}`);
    }).catch(err => {
      console.error('Nem sikerült a vágólapra másolni:', err);
    });
  }

  openCreateModal() {
  const dialogRef = this.dialog.open(GroupCreateModalComponent, {
    width: '600px',
    disableClose: true
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.loadAllGroups();
    }
  });
}

  loadGroupDetails(groupId: string) {
    this.groupService.getGroupById(groupId).subscribe({
      next: (data) => {
        this.group.set(data);
        const currentUserMember = this.group()?.members.find(
          (m: GroupMember) => m.userId._id === this.currentUserId
        );
        this.isAdmin.set(currentUserMember?.role === 'ADMIN');
      },
      error: (err) => console.error('Hiba a csoport betöltésekor', err)
    });
  }

  updateRole(memberId: string, newRole: string) {
    if (!this.isOwner()) return; 
    
    this.groupService.updateMemberRole(this.selectedGroupId(), memberId, newRole).subscribe({
      next: () => {},
      error: (err) => console.error(err)
    });
  }

  removeMember(memberId: string) {
    if (!this.isAdmin() && !this.isOwner()) return; 

    if (confirm('Biztosan el akarod távolítani ezt a tagot?')) {
      this.groupService.removeMember(this.selectedGroupId(), memberId).subscribe({
        next: () => this.loadGroupDetails(this.selectedGroupId()), 
        error: (err) => console.error(err)
      });
    }
  }

  deleteGroup() {
    const currentGroup = this.group();
    if (!this.isOwner() || !currentGroup) return; 

    const groupNameCheck = prompt(`A törléshez írd be a csoport nevét: ${currentGroup.groupName}`);
    
    if (groupNameCheck === currentGroup.groupName) {
      this.groupService.deleteGroup(this.selectedGroupId()).subscribe({
        next: () => {
          this.group.set(null);
          this.loadAllGroups();
        },
        error: (err) => console.error(err)
      });
    }
  }
}