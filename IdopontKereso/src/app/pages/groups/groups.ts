import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { InviteDialogComponent } from '../../components/invite-dialog/invite-dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SnackbarService } from '../../services/snackbar/snackbar.service';
import { PromptDialogComponent } from '../../components/prompt-dialog/prompt-dialog';

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
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './groups.html',
  styleUrl: './groups.scss',
})
export class Groups implements OnInit {
  private groupService = inject(GroupService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackbarService = inject(SnackbarService);

  myGroups = signal<Group[]>([]);
  selectedGroupId = signal<string>('');
  group = signal<Group | null>(null);
  isAdmin = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  searchQuery = signal<string>('');

  currentUserId: string = ''; 

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId(); 
    this.loadAllGroups();
  }

  filteredMembers = computed(() => {
    const currentGroup = this.group();
    if (!currentGroup || !currentGroup.members) return [];
    
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return currentGroup.members; // Ha nincs keresés, mindenkit visszaad

    return currentGroup.members.filter(member => {
      const name = (member.userId.fullName || member.userId.userName || '').toLowerCase();
      return name.includes(query);
    });
  });

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
        this.snackbarService.showError('Nem sikerült betölteni a csoportokat.');
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

    this.groupService.generateInvite(groupId).subscribe({
      next: (response) => {
        const inviteUrl = `${window.location.origin}/join/${response.token}`;
        
        this.dialog.open(InviteDialogComponent, {
          width: '450px',
          disableClose: false,
          data: { 
            inviteUrl: inviteUrl,
            groupName: this.group()?.groupName 
          }
        });
      },
      error: (err) => {
        console.error('Hiba a meghívó link generálásakor:', err);
        this.snackbarService.showError('Nem sikerült meghívót generálni. Nincs jogosultságod, vagy szerverhiba történt.');
      }
    });
  }

  openCreateModal() {
    const dialogRef = this.dialog.open(GroupCreateModalComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAllGroups();
      }
    });
  }

  loadGroupDetails(groupId: string) {
    this.searchQuery.set('');
    this.groupService.getGroupById(groupId).subscribe({
      next: (data) => {
        this.group.set(data);
        const currentUserMember = this.group()?.members.find(
          (m: GroupMember) => m.userId._id === this.currentUserId
        );
        this.isAdmin.set(currentUserMember?.role === 'ADMIN');
      },
      error: (err) => {
        console.error('Hiba a csoport betöltésekor', err);
        this.snackbarService.showError('Hiba történt a csoport adatainak lekérésekor.');
      }
    });
  }

  updateRole(memberId: string, newRole: string) {
    if (!this.isOwner()) return; 
    
    this.groupService.updateMemberRole(this.selectedGroupId(), memberId, newRole).subscribe({
      next: () => {
        this.snackbarService.showSuccess('Jogosultság sikeresen módosítva!');
      },
      error: (err) => {
        console.error(err);
        this.snackbarService.showError('Hiba a jogosultság módosításakor!');
      }
    });
  }

  removeMember(memberId: string) {
    if (!this.isAdmin() && !this.isOwner()) return; 

    if (confirm('Biztosan el akarod távolítani ezt a tagot?')) {
      this.groupService.removeMember(this.selectedGroupId(), memberId).subscribe({
        next: () => {
          this.loadGroupDetails(this.selectedGroupId());
          this.snackbarService.showSuccess('Tag sikeresen eltávolítva!');
        }, 
        error: (err) => {
          console.error(err);
          this.snackbarService.showError('Nem sikerült eltávolítani a tagot.');
        }
      });
    }
  }

  leaveGroup() {
    if (confirm('Biztosan ki szeretnél lépni ebből a csoportból?')) {
      this.groupService.removeMember(this.selectedGroupId(), this.currentUserId).subscribe({
        next: () => {
          this.group.set(null);
          this.loadAllGroups();
          this.snackbarService.showSuccess('Sikeresen kiléptél a csoportból!');
        },
        error: (err) => {
          console.error('Hiba kilépéskor:', err);
          this.snackbarService.showError('Hiba történt a kilépés során.');
        }
      });
    }
  }

  deleteGroup() {
    const currentGroup = this.group();
    if (!this.isOwner() || !currentGroup) return; 

    const dialogRef = this.dialog.open(PromptDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: {
        title: 'Csoport törlése',
        message: `A művelet végleges. A törléshez kérlek írd be a csoport nevét: "${currentGroup.groupName}"`,
        placeholder: 'Csoport neve',
        confirmText: 'Törlés',
        cancelText: 'Mégsem',
        color: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === null) return;

      if (result === currentGroup.groupName) {
        this.groupService.deleteGroup(this.selectedGroupId()).subscribe({
          next: () => {
            this.group.set(null);
            this.loadAllGroups();
            this.snackbarService.showSuccess('Csoport sikeresen törölve!');
          },
          error: (err) => {
            console.error(err);
            this.snackbarService.showError('Nem sikerült törölni a csoportot.');
          }
        });
      } else {
        this.snackbarService.showWarning('Hibás csoportnév. A törlés megszakítva!');
      }
    });
  }
}