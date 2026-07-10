import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [MatIconModule,MatButtonModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  authService = inject(AuthService);
  router = inject(Router);

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
