import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';


const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const password2 = control.get('password2');
  if (!password || !password2) return null;
  return password.value === password2.value ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-signup',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup {
  private fb = inject(FormBuilder);
  private authService = inject(Auth);
  private router = inject(Router);
  registerForm: FormGroup;
  errorMessage = signal('');

  constructor() {
    this.registerForm = this.fb.group({
      userName: ['', Validators.required],
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      password2: ['', [Validators.required, Validators.minLength(6)]],
      role: ['user', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  hide = signal(true);
  clickEvent(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }
  
  hide2 = signal(true);
  clickEvent2(event: MouseEvent) {
    this.hide2.set(!this.hide2());
    event.stopPropagation();
  }

  onSubmit() {
    if (this.registerForm.valid) {
      const { password2, ...userData } = this.registerForm.value;
      this.errorMessage.set('');
      this.authService.register(userData).subscribe({
        next: (response) => {
          console.log('Sikeres regisztráció!', response);
          this.router.navigate(['/login']); 
        },
        error: (err) => {
          console.error('Hiba történt:', err);
          const msg = err.error?.message || 'Hiba a regisztráció során';
          this.errorMessage.set(msg);
        }
      });
    }
  }
}