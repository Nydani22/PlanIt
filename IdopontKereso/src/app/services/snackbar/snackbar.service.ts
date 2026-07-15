import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CustomSnackbarComponent } from '../../components/custom-snackbar/custom-snackbar';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  private snackBar = inject(MatSnackBar);

  showSuccess(message: string, duration = 3000) {
    this.show(message, 'SUCCESS', duration);
  }

  showWarning(message: string, duration = 4000) {
    this.show(message, 'WARNING', duration);
  }

  showError(message: string, duration = 5000) {
    this.show(message, 'ERROR', duration);
  }

  private show(message: string, type: 'SUCCESS' | 'WARNING' | 'ERROR', duration: number) {
    this.snackBar.openFromComponent(CustomSnackbarComponent, {
      data: { message, type },
      duration: duration,
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
  }
}