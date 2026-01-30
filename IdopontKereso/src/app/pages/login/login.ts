import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit, OnDestroy {
  loginForm: FormGroup;
  errorMessage = signal('');
  private fb = inject(FormBuilder);
  private authService = inject(Auth);
  private router = inject(Router);
  hide = signal(true);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
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
    this.authService.login(this.loginForm.value).subscribe({
      next: (response: any) => {
        console.log('Sikeres bejelentkezés!', response);
        
        this.authService.setToken(response.token);

        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Login hiba:', err);
        this.errorMessage.set(err.error.message || 'Sikertelen bejelentkezés.');
      }
    });
  }

  
  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }

  
  updateErrorMessage() {
    if (this.email?.hasError('required')) {
      this.errorMessage.set('Adj meg egy emailt.');
    } else if (this.email?.hasError('email')) {
      this.errorMessage.set('Nem helyes email cím.');
    } else {
      this.errorMessage.set('');
    }
  }

  ngOnDestroy(): void {}
}