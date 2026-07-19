import { Injectable, effect, signal } from '@angular/core';

export type ThemeMode = 'Világos' | 'Sötét' | 'Rendszer';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  currentTheme = signal<ThemeMode>('Rendszer');
  private storageKey = 'app-theme';

  constructor() {
    this.loadTheme();

    effect(() => {
      this.applyTheme(this.currentTheme());
    });

    const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemThemeQuery.addEventListener('change', (event) => {
      if (this.currentTheme() === 'Rendszer') {
        const isNowDark = event.matches;
        if (isNowDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    });
  }

  private loadTheme() {
    const saved = localStorage.getItem(this.storageKey) as ThemeMode;
    this.currentTheme.set(saved ? saved : 'Rendszer');
  }

  setTheme(theme: ThemeMode) {
    this.currentTheme.set(theme);
    localStorage.setItem(this.storageKey, theme);
  }

  private applyTheme(theme: ThemeMode) {
    const isDark = theme === 'Sötét' || (theme === 'Rendszer' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}