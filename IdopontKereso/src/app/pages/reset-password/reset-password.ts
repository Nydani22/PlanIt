import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormGroupDirective, NgForm, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { SnackbarService } from '../../services/snackbar/snackbar.service';
import { ErrorStateMatcher } from '@angular/material/core';

export class PasswordErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    const isInvalid = !!(control && control.invalid) || !!(form && form.hasError('passwordMismatch'));
    return !!(isInvalid && (control?.dirty || control?.touched || isSubmitted));
  }
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPassword implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackbarService = inject(SnackbarService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  resetForm: FormGroup;
  isLoading = signal(false);
  hide = signal(true);
  hideConfirm = signal(true);
  token = signal<string | null>(null);
  passMatcher = new PasswordErrorStateMatcher();

  constructor() {
    this.resetForm = this.fb.group({
      newPassword: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern('^(?=.*[a-z])(?=.*\\d).+$')
      ]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['token']) {
        this.token.set(params['token']);
      } else {
        this.snackbarService.showError('Érvénytelen vagy hiányzó visszaállítási link!');
        this.router.navigate(['/login']);
      }
    });
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  clickEvent(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }

  clickEventConfirm(event: MouseEvent) {
    this.hideConfirm.set(!this.hideConfirm());
    event.stopPropagation();
  }

  onSubmit() {
    if (this.resetForm.invalid || !this.token()) return;
    
    this.isLoading.set(true);
    const newPassword = this.resetForm.value.newPassword;

    this.authService.resetPassword(this.token()!, newPassword).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.snackbarService.showSuccess('A jelszavad sikeresen megváltozott! Most már bejelentkezhetsz.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.message || 'Hiba történt a jelszó visszaállítása során.';
        this.snackbarService.showError(msg);
      }
    });
  }
}