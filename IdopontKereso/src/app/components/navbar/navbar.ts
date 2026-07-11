import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // ngClass és DatePipe miatt kell
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';   // Értesítések menüje
import { MatBadgeModule } from '@angular/material/badge'; // Piros pötty
import { AuthService } from '../../services/auth/auth.service';
import { NotificationService } from '../../services/notification/notification.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule, 
    RouterLink,
    MatMenuModule,
    MatBadgeModule
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar implements OnInit {
  authService = inject(AuthService);
  router = inject(Router);
  notificationService = inject(NotificationService);

  ngOnInit() {
    if (this.authService.getToken()) {
      this.notificationService.initNotifications();
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onNotificationClick(notificationId: string) {
    this.notificationService.markAsRead(notificationId);
  }

  markAllAsRead(event: Event) {
    event.stopPropagation();
    this.notificationService.markAllAsRead();
  }
}