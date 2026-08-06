import { Component, EventEmitter, inject, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-external-calendar-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './external-calendar-dialog.component.html',
  styleUrl: './external-calendar-dialog.component.scss'
})
export class ExternalCalendarDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  public dialogRef = inject(MatDialogRef<ExternalCalendarDialogComponent>);
  public data = inject(MAT_DIALOG_DATA, { optional: true });

  isEditMode = false;
  isSaving = signal<boolean>(false);

  @Output() action = new EventEmitter<any>();

  calendarForm: FormGroup = this.fb.group({
    _id: [null], 
    name: ['', Validators.required],
    url: ['', [Validators.required, Validators.pattern('https?://.+')]],
    color: ['#3f51b5', Validators.required]
  });

  ngOnInit(): void {
    if (this.data && this.data.calendar) {
      this.isEditMode = true;
      this.calendarForm.patchValue(this.data.calendar);
    }
  }

  save(): void {
    if (this.calendarForm.valid) {
      const calendarData = { ...this.calendarForm.value };
      this.isSaving.set(true);
      if (!calendarData._id) {
        delete calendarData._id;
      }

      this.action.emit({ 
        action: this.isEditMode ? 'update' : 'add', 
        calendar: calendarData 
      });
    }
  }

  deleteCalendar(): void {
    this.isSaving.set(true);
    this.action.emit({ 
      action: 'delete', 
      calendar: this.calendarForm.value 
    });
  }
}