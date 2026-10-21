import { Component, OnInit, PLATFORM_ID, Inject, ViewChild, ElementRef, HostListener, inject, AfterViewInit, signal } from '@angular/core';
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

export class LandingPage implements OnInit, AfterViewInit {
  @ViewChild('scrollVideo', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  private authService = inject(AuthService);
  private router = inject(Router);
  private isBrowser: boolean;
  private ticking = false;
  isVideoLoaded = signal(false);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.checkLoginStatus();
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.loadVideoAsBlob();
    }
  }

  private async loadVideoAsBlob() {
    const safetyTimeout = setTimeout(() => {
      this.revealPage();
    }, 2500);

    try {
      const response = await fetch('/videos/Calendar.mp4?ngsw-bypass=true');
      if (!response.ok) throw new Error(`Videó letöltési hiba: ${response.status}`);
      
      const blob = await response.blob();
      const videoUrl = URL.createObjectURL(blob);
      
      const video = this.videoElement.nativeElement;
      video.src = videoUrl;

      video.onloadedmetadata = () => {
        clearTimeout(safetyTimeout);
        this.revealPage();
      };

      video.onerror = () => {
        clearTimeout(safetyTimeout);
        this.revealPage();
      };
      
    } catch (error) {
      console.error('Hiba a videó betöltésekor:', error);
      clearTimeout(safetyTimeout);
      this.revealPage();
    }
  }

  revealPage(): void {
    if (this.isVideoLoaded()) return;
    
    this.isVideoLoaded.set(true);

    setTimeout(() => {
      AOS.init({ duration: 1000, once: true, offset: 100, easing: 'ease-in-out' });
    }, 50);
  }

  checkLoginStatus(): void {
    if (this.authService.getToken()) {
      this.router.navigate(['/home']);
    }
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    if (!this.isBrowser || !this.videoElement || !this.isVideoLoaded()) return;

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
    const section = document.getElementById('video-section');

    if (video.readyState >= 2 && video.duration && section) {
      const rect = section.getBoundingClientRect();
      const scrollableDistance = rect.height - window.innerHeight;
      const scrolled = -rect.top;

      let scrollFraction = scrolled / scrollableDistance;
      scrollFraction = Math.max(0, Math.min(1, scrollFraction));

      video.currentTime = video.duration * scrollFraction;
    }
  }
}