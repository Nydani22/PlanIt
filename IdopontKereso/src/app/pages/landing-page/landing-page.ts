import { Component, OnInit, PLATFORM_ID, Inject, ViewChild, ElementRef, HostListener, inject } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import AOS from 'aos';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, RouterModule],
  templateUrl: './landing-page.html',
  styleUrls: ['./landing-page.scss']
})
export class LandingPage implements OnInit {
  @ViewChild('scrollVideo', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  private authService = inject(AuthService);
  private router = inject(Router);
  private isBrowser: boolean;
  private ticking = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      AOS.init({ duration: 1000, once: true, offset: 100, easing: 'ease-in-out' });
    }
    this.checkLoginStatus();
  }

  checkLoginStatus(): void {
    if (this.authService.getToken()) {
      this.router.navigate(['/home']);
    }
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    if (!this.isBrowser || !this.videoElement) return;

    if (!this.ticking) {
      window.requestAnimationFrame(() => {
        this.updateVideoProgress();
        this.ticking = false;
      });
      this.ticking = true;
    }
  }

  private updateVideoProgress() {
    const video = this.videoElement.nativeElement;
    const section = document.getElementById('video-section'); // A konkrét szekciót figyeljük

    if (video.readyState >= 2 && video.duration && section) {
      const rect = section.getBoundingClientRect();
      
      // Kiszámoljuk, mennyi van még hátra a szekcióból
      const scrollableDistance = rect.height - window.innerHeight;
      
      // Megnézzük, mennyit görgettünk lefelé a szekció tetejétől
      const scrolled = -rect.top;

      // Százalékos arány (0-tól 1-ig)
      let scrollFraction = scrolled / scrollableDistance;

      // Biztosítjuk, hogy az érték szigorúan 0 és 1 között maradjon
      scrollFraction = Math.max(0, Math.min(1, scrollFraction));

      // Videó idejének frissítése
      video.currentTime = video.duration * scrollFraction;
    }
  }
}