import { Component, inject, signal, effect, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    Navbar, 
    MatSidenavModule, 
    MatDialogModule,
    MatIcon,
    FormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatTooltipModule  
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackbarService = inject(SnackbarService);
  calendarRefreshService = inject(CalendarRefreshService);
  isSidebarOpen = signal<boolean>(this.getInitialSidebarState());
  private previousUrl: string = '';

  constructor() {
    effect(() => {
      const isOpen = this.isSidebarOpen();
      const url = this.router.url;
      
      const isExcludedPage = url.startsWith('/login') || 
                             url.startsWith('/register') || 
                             url.startsWith('/join');

      if (!isExcludedPage) {
        localStorage.setItem('sidebarOpen', JSON.stringify(isOpen));
      }
    });
  }

  ngOnInit() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const currentUrl = event.urlAfterRedirects || event.url;
      this.checkRoute(currentUrl);
      this.previousUrl = currentUrl; 
    });
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