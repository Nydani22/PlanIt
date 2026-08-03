import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class CalendarRefreshService {
  private refreshSource = new Subject<void>();
  refresh$ = this.refreshSource.asObservable();

  private platformId = inject(PLATFORM_ID);
  isBrowser = signal<boolean>(isPlatformBrowser(this.platformId));

  interactionsEnabled = signal<boolean>(this.getInitialInteractionState());
  selectedDate = signal<Date>(new Date());

  constructor() {
    effect(() => {
      const isEnabled = this.interactionsEnabled();
      if (this.isBrowser()) {
        localStorage.setItem('calendarInteractionsEnabled', JSON.stringify(isEnabled));
      }
    });
  }

  private getInitialInteractionState(): boolean {
    if (isPlatformBrowser(this.platformId) && window.localStorage) {
      const storedState = localStorage.getItem('calendarInteractionsEnabled');
      if (storedState !== null) {
        return JSON.parse(storedState);
      }
    }
    return false;
  }

  triggerRefresh() {
    this.refreshSource.next();
  }
}