import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../services/user/user.service';
import { AuthService } from '../../services/auth/auth.service';
import { ThemeService, ThemeMode } from '../../services/theme/theme.service';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [ReactiveFormsModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatCheckboxModule, MatButtonModule],
  templateUrl: './profil.html',
  styleUrl: './profil.scss',
})
export class Profil implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);

  profileForm!: FormGroup;
  
  isLoading = signal(true);
  saveMessage = signal('');

  ngOnInit(): void {
    this.initForm();
    this.setupThemeListener();
    this.loadUserData();
  }

  private initForm(): void {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      email: [{ value: '', disabled: true }],
      settings: this.fb.group({
        timezone: ['Europe/Budapest'],
        defaultView: ['week'],
        dayStartHour: [8, [Validators.min(0), Validators.max(23)]],
        dayEndHour: [20, [Validators.min(1), Validators.max(24)]],
        hideWeekends: [false],
        hourSegments: [2]
      }),
      localTheme: [this.themeService.currentTheme()] 
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

    this.userService.getUser(userId).subscribe({
      next: (user) => {
        this.profileForm.patchValue({
          name: user.fullName,
          email: user.email,
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
      settings: formValues.settings
    };

    this.userService.updateUser(userId, updateData).subscribe({
      next: () => {
        this.saveMessage.set('Beállítások sikeresen elmentve!');
        
        setTimeout(() => {
          this.saveMessage.set('');
        }, 3000);
      },
      error: (err) => console.error('Hiba a mentés során', err)
    });
  }
}