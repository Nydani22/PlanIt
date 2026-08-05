import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';
import { Notification } from '../../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private socket: Socket | null = null;
  private apiUrl = `${environment.apiUrl}/api/notifications`;
  
  notifications = signal<Notification[]>([]);
  unreadCount = signal<number>(0);

  
  initNotifications() {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return;

    this.loadInitialNotifications();

    if (!this.socket) {
      this.socket = io(environment.apiUrl);

      this.socket.on('connect', () => {
        this.socket?.emit('authenticate', userId);
      });

      this.socket.on('newNotification', (newNotif: Notification) => {
        this.notifications.update(current => [newNotif, ...current]);
        this.unreadCount.update(count => count + 1);
      });
    }
  }

  private loadInitialNotifications() {
    this.http.get<Notification[]>(this.apiUrl, { withCredentials: true }).subscribe({
      next: (data: Notification[]) => {
        this.notifications.set(data);
        this.unreadCount.set(data.filter(n => !n.isRead).length);
      },
      error: (err: HttpErrorResponse) => console.error('Hiba az értesítések lekérésekor', err)
    });
  }

  markAsRead(notificationId: string) {
    this.http.patch(`${this.apiUrl}/${notificationId}/read`, {}, { withCredentials: true })
      .subscribe(() => {
        this.notifications.update(notifs => 
          notifs.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
        );
        this.unreadCount.update(c => Math.max(0, c - 1));
      });
  }

  markAllAsRead() {
    this.http.patch(`${this.apiUrl}/read-all`, {}, { withCredentials: true })
      .subscribe(() => {
        this.notifications.update(notifs => notifs.map(n => ({ ...n, isRead: true })));
        this.unreadCount.set(0);
      });
  }
}