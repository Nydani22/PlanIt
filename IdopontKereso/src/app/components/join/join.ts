import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GroupService } from '../../services/group/group.service';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-join',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, RouterLink],
  templateUrl: './join.html',
  styleUrl: './join.scss',
})
export class JoinComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  groupService = inject(GroupService);
  private authService = inject(AuthService);

  groupId: string | null = null;
  errorMessage: string = '';
  isLoading: boolean = false;

  
  isAlreadyMember = signal<boolean>(false);
  isCheckingStatus = signal<boolean>(true);

  ngOnInit() {
    this.groupId = this.route.snapshot.paramMap.get('id');
    const userId = this.authService.getCurrentUserId();
    
    if (!this.groupId) {
      this.errorMessage = 'Érvénytelen vagy hiányzó meghívó link!';
      this.isCheckingStatus.set(false);
      return;
    }

    this.groupService.getPublicGroupInfo(this.groupId).subscribe({
      next: (group) => {
        this.isCheckingStatus.set(false);
      },
      error: () => {
        this.errorMessage = 'Nem sikerült betölteni a csoport adatait.';
        this.isCheckingStatus.set(false);
      }
    });
  }

  onJoin() {
    if (!this.groupId) return;
    
    this.isLoading = true;
    this.errorMessage = '';

    this.groupService.joinGroup(this.groupId).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.router.navigate(['/groups']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Váratlan hiba történt a csatlakozáskor.';
      }
    });
  }

  cancel() {
    this.router.navigate(['/']);
  }
}