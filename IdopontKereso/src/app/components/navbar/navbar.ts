import { Component, EventEmitter, OnInit, Output, inject, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './navbar.scss',
})
export class Navbar {
  authService = inject(AuthService);
  router = inject(Router);
  notificationService = inject(NotificationService);

  @Output() menuToggled = new EventEmitter<void>();

  constructor() {
    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.notificationService.initNotifications();
      }
    });
  }

  logout() {
    this.authService.logout();
  }

  onNotificationClick(notificationId: string) {
    this.notificationService.markAsRead(notificationId);
  }

  markAllAsRead(event: Event) {
    event.stopPropagation();
    this.notificationService.markAllAsRead();
  }

  onToggleMenu() {
    this.menuToggled.emit();
  }
}