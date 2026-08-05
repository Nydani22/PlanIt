import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-custom-snackbar',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './custom-snackbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './custom-snackbar.scss'
})
export class CustomSnackbarComponent {
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: { message: string, type: 'SUCCESS' | 'WARNING' | 'ERROR' },
    public snackBarRef: MatSnackBarRef<CustomSnackbarComponent>
  ) {}

  getIcon(): string {
    switch (this.data.type) {
      case 'SUCCESS': return 'check_circle';
      case 'WARNING': return 'warning';
      case 'ERROR': return 'error';
      default: return 'info';
    }
  }

  getThemeColor(): 'primary' | 'accent' | 'warn' | undefined {
    switch (this.data.type) {
      case 'SUCCESS': return 'primary';
      case 'WARNING': return 'accent';
      case 'ERROR': return 'warn';
      default: return undefined;
    }
  }
}