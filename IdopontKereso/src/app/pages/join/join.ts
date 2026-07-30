import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GroupService } from '../../services/group/group.service';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth.service';
import { SnackbarService } from '../../services/snackbar/snackbar.service';

@Component({
  selector: 'app-join',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, RouterLink],
  templateUrl: './join.html',
  styleUrl: './join.scss',
})
export class Join implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  groupService = inject(GroupService);
  private authService = inject(AuthService);
  private snackbarService = inject(SnackbarService);
  token: string | null = null;
  errorMessage: string = '';
  isLoading: boolean = false;

  isLoggedIn = signal<boolean>(true);
  isAlreadyMember = signal<boolean>(false);
  isCheckingStatus = signal<boolean>(true);
  

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('id');
    const userId = this.authService.getCurrentUserId();
    
    if (!userId) {
      this.isLoggedIn.set(false);
    }

    if (!this.token) {
      this.errorMessage = 'Érvénytelen vagy hiányzó meghívó link!';
      this.isCheckingStatus.set(false);
      return;
    }

    this.groupService.getInviteInfo(this.token).subscribe({
      next: (groupInfo: any) => {
        if (userId && groupInfo && groupInfo._id) {
          this.groupService.getGroupById(groupInfo._id).subscribe({
            next: (group: any) => {
              const isMember = group.members.some((m: any) => 
                (m.userId._id || m.userId) === userId
              );
              this.isAlreadyMember.set(isMember);
              this.isCheckingStatus.set(false);
            },
            error: () => {
              this.isAlreadyMember.set(false);
              this.isCheckingStatus.set(false);
            }
          });
        } else {
          this.isCheckingStatus.set(false);
        }
      },
      error: (err) => {
        if (err.status === 404) {
          this.errorMessage = 'Sajnos a meghívó érvénytelen, lejárt, vagy már felhasználták.';
        } else {
          this.errorMessage = 'Nem sikerült betölteni a meghívó adatait.';
        }
        this.isCheckingStatus.set(false);
      }
    });
  }

  goToLogin() {
    localStorage.setItem('redirectAfterLogin', `/join/${this.token}`);
    this.router.navigate(['/login']);
  }

  onJoin() {
    if (!this.token) return;
    
    this.isLoading = true;
    this.errorMessage = '';

    this.groupService.joinWithInvite(this.token).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.snackbarService.showSuccess('Sikeres csatlakozás a csoportba!');
        this.router.navigate(['/groups']);
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.message || 'Váratlan hiba történt a csatlakozáskor.';
        
        if (msg === 'Már tagja vagy ennek a csoportnak!') {
          this.isAlreadyMember.set(true);
        } else {
          this.errorMessage = msg;
        }
      }
    });
  }

  cancel() {
    this.router.navigate(['/']);
  }
}