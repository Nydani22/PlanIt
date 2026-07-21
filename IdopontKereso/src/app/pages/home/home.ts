import { Component, inject, signal, ViewChild } from '@angular/core';
import { CalendarViewComponent } from "../../components/calendar-view/calendar-view";
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../services/auth/auth.service';
import { Router } from '@angular/router';
import { EventDialogComponent } from '../../components/event-dialog/event-dialog'; 
import { SnackbarService } from '../../services/snackbar/snackbar.service';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CalendarViewComponent, MatButtonModule, MatDialogModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private snackbarService=inject(SnackbarService);
  
  @ViewChild(CalendarViewComponent) calendar!: CalendarViewComponent;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  openEventDialog() {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    const dialogRef = this.dialog.open(EventDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      restoreFocus: false, 
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackbarService.showSuccess('Esemény sikeresen rögzítve!');
        if (this.calendar) {
          this.calendar.loadEvents();
        }
      }
    });
  }
}