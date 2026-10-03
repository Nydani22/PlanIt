import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../services/auth/auth.service';
import { SnackbarService } from '../../services/snackbar/snackbar.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPassword {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackbarService = inject(SnackbarService);

  forgotForm: FormGroup;
  isLoading = signal(false);
  isSuccess = signal(false);

  constructor() {
    this.forgotForm = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')
      ]]
    });
  }

  onSubmit() {
    if (this.forgotForm.valid) {
      this.isLoading.set(true);
      const email = this.forgotForm.value.email;

      this.authService.requestPasswordReset(email).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.isSuccess.set(true);
          this.snackbarService.showSuccess('A visszaállítási linket elküldtük az e-mail címedre!');
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg = err.error?.message || 'Hiba történt a kérés során.';
          this.snackbarService.showError(msg);
        }
      });
    }
  }
}