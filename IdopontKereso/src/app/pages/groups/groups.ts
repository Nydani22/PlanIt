import { Component, OnInit, inject, signal, computed, effect, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../services/group/group.service';
import { AuthService } from '../../services/auth/auth.service';
import { Group } from '../../models/group.model';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { GroupCreateModalComponent } from '../../components/group-create-modal/group-create-modal';
import { InviteDialogComponent } from '../../components/invite-dialog/invite-dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SnackbarService } from '../../services/snackbar/snackbar.service';
import { PromptDialogComponent } from '../../components/prompt-dialog/prompt-dialog';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GroupStateService } from '../../services/groupstate/groupstate.service';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './groups.scss',
})
export class Groups implements OnInit {
  private groupService = inject(GroupService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackbarService = inject(SnackbarService);
  groupState = inject(GroupStateService);
  private destroyRef = inject(DestroyRef);

  group = signal<Group | null>(null);
  isAdmin = signal<boolean>(false);
  searchQuery = signal<string>('');
  currentUserId: string = ''; 

  constructor() {
    effect(() => {
      const id = this.groupState.selectedGroupId();
      if (id) {
        this.loadGroupDetails(id);
      } else {
        this.group.set(null);
      }
    });

    this.groupState.openCreateModal$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.openCreateModal());
  }

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId(); 
    this.groupState.loadGroups();
  }


  filteredMembers = computed(() => {
    const currentGroup = this.group();
    if (!currentGroup || !currentGroup.members) return [];
    
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return currentGroup.members;

    return currentGroup.members.filter(member => {
      const name = (member.userId.fullName || member.userId.userName || '').toLowerCase();
      return name.includes(query);
    });
  });

  isOwner(): boolean {
    const currentGroup = this.group();
    if (!currentGroup || !this.currentUserId) return false;
    
    const me = currentGroup.members.find(m => m.userId._id === this.currentUserId);
    return me?.role === 'OWNER';
  }


  editGroup() {
    const currentGroup = this.group();
    if (!currentGroup) return;

    const dialogRef = this.dialog.open(GroupCreateModalComponent, {
      width: '600px',
      maxWidth: '90vw',
      restoreFocus: false,
      autoFocus: false,
      disableClose: true,
      data: { group: currentGroup }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.groupState.loadGroups();
        this.loadGroupDetails(currentGroup._id);
        this.snackbarService.showSuccess('A csoport sikeresen frissítve!');
      }
    });
  }

  copyInviteLink() {
    const groupId = this.groupState.selectedGroupId();
    if (!groupId) return;

    this.groupService.generateInvite(groupId).subscribe({
      next: (response) => {
        const inviteUrl = `${window.location.origin}/join/${response.token}`;
        
        this.dialog.open(InviteDialogComponent, {
          width: '450px',
          disableClose: false,
          restoreFocus: false,
          autoFocus: false,
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
      restoreFocus: false,
      autoFocus: false,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.groupState.loadGroups();
      }
    });
  }

  loadGroupDetails(groupId: string) {
    this.searchQuery.set('');
    this.groupService.getGroupById(groupId).subscribe({
      next: (data) => {
        this.group.set(data);
        const currentUserMember = this.group()?.members.find(m => m.userId._id === this.currentUserId);
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
    
    this.groupService.updateMemberRole(this.groupState.selectedGroupId(), memberId, newRole).subscribe({
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

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      restoreFocus: false,
      autoFocus: false,
      data: {
        title: 'Tag eltávolítása',
        message: 'Biztosan el akarod távolítani ezt a tagot a csoportból?',
        confirmText: 'Eltávolítás',
        cancelText: 'Mégsem',
        color: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.groupService.removeMember(this.groupState.selectedGroupId(), memberId).subscribe({
          next: () => {
            this.groupState.loadGroups();
            this.snackbarService.showSuccess('Tag sikeresen eltávolítva!');
          }, 
          error: (err) => {
            console.error(err);
            this.snackbarService.showError('Nem sikerült eltávolítani a tagot.');
          }
        });
      }
    });
  }

  leaveGroup() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      restoreFocus: false,
      autoFocus: false,
      data: {
        title: 'Kilépés a csoportból',
        message: 'Biztosan ki szeretnél lépni ebből a csoportból? Később csak új meghívóval tudsz visszajönni.',
        confirmText: 'Kilépés',
        cancelText: 'Mégsem',
        color: 'warn' 
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.groupService.removeMember(this.groupState.selectedGroupId(), this.currentUserId).subscribe({
          next: () => {
            this.group.set(null);
            this.groupState.loadGroups();
            this.snackbarService.showSuccess('Sikeresen kiléptél a csoportból!');
          },
          error: (err) => {
            console.error('Hiba kilépéskor:', err);
            this.snackbarService.showError('Hiba történt a kilépés során.');
          }
        });
      }
    });
  }

  deleteGroup() {
    const currentGroup = this.group();
    if (!this.isOwner() || !currentGroup) return; 

    const dialogRef = this.dialog.open(PromptDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      restoreFocus: false,
      autoFocus: false,
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
        this.groupService.deleteGroup(this.groupState.selectedGroupId()).subscribe({
          next: () => {
            this.group.set(null);
            this.groupState.loadGroups();
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