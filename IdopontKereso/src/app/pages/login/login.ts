import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { NotificationService } from '../../services/notification/notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';

@Component({
  selector: 'app-login',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, ReactiveFormsModule, RouterLink, MatProgressSpinnerModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  loginForm: FormGroup;
  errorMessage = signal('');
  hide = signal(true);
  isLoading = signal(false);

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService=inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [
        Validators.required, 
        Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')
      ]],
      password: ['', [
        Validators.required, 
        Validators.minLength(6),
        Validators.pattern('^(?=.*[a-z])(?=.*\\d).+$')
      ]]
    });
  }

  ngOnInit(): void {
    this.checkLoginStatus();
  }

  
  clickEvent(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }

  
  checkLoginStatus(): void {
    if (this.authService.getToken()) {
      this.router.navigate(['/']);
    }
  }

  login() {
    if (this.loginForm.invalid) return;
    this.isLoading.set(true);

    this.authService.login(this.loginForm.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          this.isLoading.set(false);
          this.authService.setToken(response.token);
          this.notificationService.initNotifications();
          
          const redirectUrl = localStorage.getItem('redirectAfterLogin');
          
          if (redirectUrl) {
            localStorage.removeItem('redirectAfterLogin');
            this.router.navigateByUrl(redirectUrl);
          } else {
            this.router.navigate(['/']);
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          console.error('Login hiba:', err);
          this.errorMessage.set(err.error?.message || 'Sikertelen bejelentkezés.');
        }
      });
  }

  
  get email() { return this.loginForm.controls['email']; }
  get password() { return this.loginForm.controls['password']; }

  
  updateErrorMessage() {
    if (this.email.hasError('required')) {
      this.errorMessage.set('Adj meg egy emailt.');
    } else if (this.email.hasError('email')) {
      this.errorMessage.set('Nem helyes email cím.');
    } else {
      this.errorMessage.set('');
    }
  }

}