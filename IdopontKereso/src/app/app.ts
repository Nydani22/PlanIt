import { Component, inject, signal, effect, OnInit, HostListener, ChangeDetectionStrategy, untracked } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Navbar } from './components/navbar/navbar';
import { ThemeService } from './services/theme/theme.service';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from './services/auth/auth.service';
import { SnackbarService } from './services/snackbar/snackbar.service';
import { EventDialogComponent } from './components/event-dialog/event-dialog';
import { CalendarRefreshService } from './services/calendarRefresh/calendar-refresh.service';
import { MatIcon } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GroupStateService } from './services/groupstate/groupstate.service';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ExternalCalendarDialogComponent } from './components/external-calendar-dialog/external-calendar-dialog.component';
import { UserService } from './services/user/user.service';
import { ExternalCalendar, User } from './models/user.model';
import { UserStatsResponse, upcomingEvents } from './models/event.model';
import { EventService } from './services/event/event.service';
import { AiChatComponent } from './components/ai-chat/ai-chat.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet, 
    Navbar,
    MatSidenavModule, 
    MatDialogModule,
    MatIcon,
    FormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AiChatComponent
  ],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private themeService = inject(ThemeService);
  authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private eventService = inject(EventService);
  private snackbarService = inject(SnackbarService);
  calendarRefreshService = inject(CalendarRefreshService);
  
  isSidebarOpen = signal<boolean>(this.getInitialSidebarState());
  isGroupsRoute = signal<boolean>(false);
  isProfileRoute = signal<boolean>(false);
  isMobile = signal<boolean>(false);
  groupState = inject(GroupStateService);
  private previousUrl: string = '';

  userExternalCalendars = signal<ExternalCalendar[]>([]);
  upcomingEvents = signal<upcomingEvents[]>([]);
  statsTimeframe = signal<'week' | 'month'>('week');
  
  weeklyEventCount = signal<number>(0);
  weeklyHours = signal<number>(0);
  weeklyBusyPercentage = signal<number>(0);

  monthlyEventCount = signal<number>(0);
  monthlyHours = signal<number>(0);
  monthlyBusyPercentage = signal<number>(0);

  constructor() {
    effect(() => {
      const isOpen = this.isSidebarOpen();
      const url = this.router.url;
      
      const isExcludedPage = url.startsWith('/login') || url.startsWith('/register') || url.startsWith('/join');

      if (!isExcludedPage) {
        localStorage.setItem('sidebarOpen', JSON.stringify(isOpen));
      }
    });
  }

  ngOnInit() {
    this.checkScreenSize();
    
    this.loadUserCalendars();
    this.loadUserStats();

    this.calendarRefreshService.refresh$.subscribe(() => {
      this.loadUserCalendars();
      this.loadUserStats();
    });

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const currentUrl = event.urlAfterRedirects || event.url;
      this.checkRoute(currentUrl);
      this.previousUrl = currentUrl;
      this.isGroupsRoute.set(currentUrl.includes('/groups'));
      this.isProfileRoute.set(currentUrl.includes('/profil'));

      const isAuthPage = currentUrl.startsWith('/login') || currentUrl.startsWith('/register') || currentUrl.startsWith('/join');
      
      if (!isAuthPage && this.authService.getCurrentUserId()) {
        this.loadUserStats();
        this.loadUserCalendars();
      }
    });
  }

  loadUserCalendars() {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      this.userService.getCurrentUser().subscribe({
        next: (user: User) => {
          this.userExternalCalendars.set(user.externalCalendars || []);
        },
        error: (err) => console.error('Hiba a naptárak betöltésekor:', err)
      });
    }
  }

  loadUserStats() {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return; 

    this.eventService.getUserStats().subscribe({
      next: (stats: UserStatsResponse) => {
        this.weeklyEventCount.set(stats.weekly.eventCount);
        this.weeklyHours.set(stats.weekly.hours);
        this.weeklyBusyPercentage.set(stats.weekly.busyPercentage);

        this.monthlyEventCount.set(stats.monthly.eventCount);
        this.monthlyHours.set(stats.monthly.hours);
        this.monthlyBusyPercentage.set(stats.monthly.busyPercentage);

        this.upcomingEvents.set(stats.upcomingEvents);
      },
      error: (err) => {
        console.error('Hiba a statisztikák betöltésekor:', err);
      }
    });
  }

  openExternalCalendarDialog(calendarToEdit?: ExternalCalendar) {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return;

    const dialogRef = this.dialog.open(ExternalCalendarDialogComponent, {
      width: '650px',
      maxWidth: '90vw',
      restoreFocus: false,
      autoFocus: false,
      data: calendarToEdit ? { calendar: calendarToEdit } : null 
    });

    dialogRef.componentInstance.action.subscribe((result: any) => {
      
      let updatedList = [...this.userExternalCalendars()];

      if (result.action === 'add') {
        const isDuplicate = updatedList.some(c => c.url === result.calendar.url);
        
        if (isDuplicate) {
          this.snackbarService.showWarning('Ez a naptár link már hozzá van adva!');
          dialogRef.componentInstance.isSaving.set(false);
          return;
        }
        
        updatedList.push(result.calendar);
      } 
      else if (result.action === 'update') {
        const isDuplicate = updatedList.some(c => c.url === result.calendar.url && c._id !== result.calendar._id);
        
        if (isDuplicate) {
          this.snackbarService.showWarning('Ez a naptár link már szerepel egy másik naptárnál!');
          dialogRef.componentInstance.isSaving.set(false);
          return;
        }

        const index = updatedList.findIndex(c => c._id === result.calendar._id);
        if (index > -1) updatedList[index] = result.calendar;
      } 
      else if (result.action === 'delete') {
        updatedList = updatedList.filter(c => c._id !== result.calendar._id);
      }

      this.userService.updateUser(userId, { externalCalendars: updatedList }).subscribe({
        next: (updatedUser: User) => {
          this.snackbarService.showSuccess(
            result.action === 'delete' ? 'Naptár sikeresen törölve!' : 'Naptár sikeresen frissítve!'
          );
          
          this.userExternalCalendars.set(updatedUser.externalCalendars || []);
          this.calendarRefreshService.triggerRefresh();
          
          dialogRef.close();
        },
        error: (err) => {
          this.snackbarService.showError('Hiba történt a művelet során.');
          console.error(err);
          dialogRef.componentInstance.isSaving.set(false);
        }
      });
    });
  }

  @HostListener('window:resize')
  checkScreenSize() {
    if (typeof window !== 'undefined') {
      this.isMobile.set(window.innerWidth < 768); 
    }
  }

  private checkRoute(url: string) {
    const isExcludedPage = url.startsWith('/login') || 
                           url.startsWith('/register') || 
                           url.startsWith('/join');

    if (isExcludedPage) {
      this.isSidebarOpen.set(false);
    } else if (this.previousUrl.startsWith('/login') || this.previousUrl.startsWith('/register')) {
      this.isSidebarOpen.set(true);
      localStorage.setItem('sidebarOpen', 'true');
    } else {
      this.isSidebarOpen.set(this.getInitialSidebarState(url));
    }
  }

  onDateSelected(date: Date | null) {
    if (date) {
      this.calendarRefreshService.selectedDate.set(date);
      if (this.router.url !== '/') {
        this.router.navigate(['/']);
      }
    }
  }

  private getInitialSidebarState(currentUrl?: string): boolean {
    const path = currentUrl || (typeof window !== 'undefined' ? window.location.pathname : '');
    
    const isExcluded = path.startsWith('/login') || 
                       path.startsWith('/register') || 
                       path.startsWith('/join');
                       
    if (isExcluded) {
      return false;
    }

    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;

      if (isMobile) {
        return false;
      }

      const storedState = localStorage.getItem('sidebarOpen');
      if (storedState !== null) {
        return JSON.parse(storedState);
      }
    }
    return true; 
  }

  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }

  openEventDialog() {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    const dialogRef = this.dialog.open(EventDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      restoreFocus: false, 
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackbarService.showSuccess('Esemény sikeresen rögzítve!');
        this.calendarRefreshService.triggerRefresh();
      }
    });
  }

  navigateToFindTime() {
    this.router.navigate(['/find-time']);
  }
}