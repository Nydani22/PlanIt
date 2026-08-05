import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormGroupDirective, NgForm, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { UserService } from '../../services/user/user.service';
import { AuthService } from '../../services/auth/auth.service';
import { ThemeService, ThemeMode } from '../../services/theme/theme.service';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { SnackbarService } from '../../services/snackbar/snackbar.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';
import { ErrorStateMatcher } from '@angular/material/core';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog';
import { MatDialog } from '@angular/material/dialog';
import { TokenResponse, User } from '../../models/user.model';

export class TimeRangeErrorMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    const isControlInvalid = control?.invalid;
    const parentHasError = control?.parent?.hasError('timeRangeInvalid');
    
    return !!((isControlInvalid || parentHasError) && (control?.dirty || control?.touched || isSubmitted));
  }
}

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [ReactiveFormsModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatCheckboxModule, MatButtonModule, MatIconModule, CommonModule],
  templateUrl: './profil.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './profil.scss',
})


export class Profil implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private snackbarService = inject(SnackbarService);
  private dialog = inject(MatDialog);
  calendarFeedUrl = signal<string>('Nincs még token generálva');
  timeRangeMatcher = new TimeRangeErrorMatcher();
  profileForm!: FormGroup;
  
  isLoading = signal(true);
  isCopied = signal(false);

  ngOnInit(): void {
    this.initForm();
    this.setupThemeListener();
    this.loadUserData();
  }

  private initForm(): void {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      userName: ['', Validators.required],
      email: [{ value: '', disabled: true }],
      externalCalendarUrl: [''],
      calendarFeedToken: [{ value: '', disabled: true }],
      settings: this.fb.group({
        defaultView: ['week'],
        dayStartHour: [8, [Validators.min(0), Validators.max(23)]],
        dayEndHour: [20, [Validators.min(1), Validators.max(24)]],
        hideWeekends: [false],
        hourSegments: [2]
      }, { validators: this.timeRangeValidator }),
      localTheme: [this.themeService.currentTheme()] 
    });
  }

  private timeRangeValidator(group: AbstractControl): ValidationErrors | null {
    const start = group.get('dayStartHour')?.value;
    const end = group.get('dayEndHour')?.value;

    if (start !== null && end !== null && start >= end) {
      return { timeRangeInvalid: true };
    }
    return null;
  }

  regenerateToken() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      restoreFocus: false,
      autoFocus: false,
      data: {
        title: 'Naptár link újragenerálása',
        message: 'Biztosan új linket szeretnél generálni? A régi linket használó naptárak azonnal leállnak!',
        confirmText: 'Újragenerálás',
        cancelText: 'Mégsem',
        color: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe((isConfirmed: boolean) => {
      if (isConfirmed) {
        this.userService.regenerateCalendarToken().subscribe({
          next: (response: TokenResponse) => {
            if (response.success) {
              const newFeedUrl = `${environment.apiUrl}/api/events/feed/${response.token}`;
              
              this.calendarFeedUrl.set(newFeedUrl);

              this.snackbarService.showSuccess('A naptár link sikeresen megújítva!');
            }
          },
          error: (err) => {
            this.snackbarService.showError('Nem sikerült új linket generálni.');
            console.error(err);
          }
        });
      }
    });
  }

  copyToClipboard(): void {
    const feedUrl = this.calendarFeedUrl();
    
    if (!feedUrl || feedUrl === 'Nincs még token generálva') {
      return;
    }

    navigator.clipboard.writeText(feedUrl).then(() => {
      this.isCopied.set(true);
      setTimeout(() => {
        this.isCopied.set(false);
      }, 3000);
    }).catch(err => {
      console.error('Hiba történt a másolás során: ', err);
    });
  }

  private setupThemeListener(): void {
    this.profileForm.get('localTheme')?.valueChanges.subscribe((newTheme: ThemeMode) => {
      if (newTheme) {
        this.themeService.setTheme(newTheme); 
      }
    });
  }

  private loadUserData(): void {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      this.isLoading.set(false);
      return;
    }

    this.userService.getCurrentUser().subscribe({
      next: (user: User) => {
        
        const feedUrl = user.calendarFeedToken 
          ? `${environment.apiUrl}/api/events/feed/${user.calendarFeedToken}` 
          : 'Nincs még token generálva';

        this.calendarFeedUrl.set(feedUrl);

        this.profileForm.patchValue({
          name: user.fullName,
          userName: user.userName,
          email: user.email,
          externalCalendarUrl: user.externalCalendarUrl || '',
          settings: user.settings
        });
        
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Hiba a profil betöltésekor', err);
        this.isLoading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) return;

    const formValues = this.profileForm.getRawValue();
    const userId = this.authService.getCurrentUserId();

    if (!userId) return;

    const updateData = {
      fullName: formValues.name,
      userName: formValues.userName,
      externalCalendarUrl: formValues.externalCalendarUrl, 
      settings: formValues.settings
    };

    this.userService.updateUser(userId, updateData).subscribe({
      next: () => {
        this.snackbarService.showSuccess('Beállítások sikeresen elmentve!');
      },
      error: (err) => console.error('Hiba a mentés során', err)
    });
  }
}