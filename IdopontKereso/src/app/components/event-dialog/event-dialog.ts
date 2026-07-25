import { Component, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog'; 
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { provideNativeDateAdapter } from '@angular/material/core';
import { EventService } from '../../services/event/event.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { SlicePipe } from '@angular/common';
import { AppEvent } from '../../models/event.model';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog';
import { FIXED_CATEGORIES, CategoryDefinition } from '../../constants/category-icons.constants';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';

export interface EventDialogData {
  event?: AppEvent;
}

@Component({
  selector: 'app-event-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatStepperModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonToggleModule,
    SlicePipe,
    MatDividerModule
],
  providers: [provideNativeDateAdapter()],
  templateUrl: './event-dialog.html',
  styleUrls: ['./event-dialog.scss']
})
export class EventDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private eventService = inject(EventService);
  private dialogRef = inject(MatDialogRef<EventDialogComponent>);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);
  public data = inject<EventDialogData>(MAT_DIALOG_DATA, { optional: true }); 

  eventForm: FormGroup;
  isEditMode = signal<boolean>(false);
  isUpdateMode: boolean = false;
  categoriesList: CategoryDefinition[] = FIXED_CATEGORIES;
  
  daysOfWeekList = [
    { value: 1, name: 'Hétfő' },
    { value: 2, name: 'Kedd' },
    { value: 3, name: 'Szerda' },
    { value: 4, name: 'Csütörtök' },
    { value: 5, name: 'Péntek' },
    { value: 6, name: 'Szombat' },
    { value: 0, name: 'Vasárnap' }
  ];

  constructor() {
    this.eventForm = this.fb.group({
      basicDetails: this.fb.group({
        eventName: ['', Validators.required],
        description: ['']
      }),
      categoryDetails: this.fb.group({
        categoryId: ['', Validators.required]
      }),
      timeDetails: this.fb.group({
        isAllDay: [false],
        startDate: ['', Validators.required],
        startTime: ['08:00'],
        endDate: ['', Validators.required],
        endTime: ['09:00']
      }),
      recurrenceDetails: this.fb.group({
        isRecurring: [false],
        frequency: ['none'],
        daysOfWeek: [[]],
        untilDate: ['']
      }),
      settingsDetails: this.fb.group({
        color: ['#3b82f6'],
        sendNotification: [false],
        allowOverlap: [false]
      })
    });
  }

  ngOnInit() {

    if (this.data && this.data.event?._id) {
      this.isUpdateMode = true;
    }
    this.eventForm.get('recurrenceDetails.frequency')?.disable();
    this.eventForm.get('recurrenceDetails.daysOfWeek')?.disable();
    this.eventForm.get('recurrenceDetails.untilDate')?.disable();

    this.eventForm.get('recurrenceDetails.isRecurring')?.valueChanges.subscribe(isRecurring => {
      const freqCtrl = this.eventForm.get('recurrenceDetails.frequency');
      const untilCtrl = this.eventForm.get('recurrenceDetails.untilDate');
      const endDateCtrl = this.eventForm.get('timeDetails.endDate'); 
      
      if (isRecurring) {
        freqCtrl?.enable();
        untilCtrl?.enable();
        endDateCtrl?.clearValidators(); 
        freqCtrl?.setValidators([
          Validators.required, 
          Validators.pattern('^(DAILY|WEEKLY)$')
        ]);
      } else {
        freqCtrl?.disable();
        untilCtrl?.disable();
        freqCtrl?.setValue('');
        endDateCtrl?.setValidators([Validators.required]); 
        
        freqCtrl?.clearValidators();
      }

      freqCtrl?.updateValueAndValidity(); 
      endDateCtrl?.updateValueAndValidity(); 
    });

    this.eventForm.get('recurrenceDetails.frequency')?.valueChanges.subscribe(freq => {
      const daysCtrl = this.eventForm.get('recurrenceDetails.daysOfWeek');
      
      if (freq === 'WEEKLY') {
        daysCtrl?.enable();
        daysCtrl?.setValidators([Validators.required]); 
      } else {
        daysCtrl?.disable();
        daysCtrl?.setValue([]);
        daysCtrl?.clearValidators(); 
      }
      
      daysCtrl?.updateValueAndValidity(); 
    });

    this.eventForm.get('timeDetails.isAllDay')?.valueChanges.subscribe(isAllDay => {
      const startTimeCtrl = this.eventForm.get('timeDetails.startTime');
      const endTimeCtrl = this.eventForm.get('timeDetails.endTime');
      
      if (isAllDay) {
        startTimeCtrl?.disable();
        endTimeCtrl?.disable();
      } else {
        startTimeCtrl?.enable();
        endTimeCtrl?.enable();
      }
    });

    this.eventForm.get('categoryDetails.categoryId')?.valueChanges.subscribe(categoryId => {
      const selectedCategory = this.categoriesList.find(cat => cat.id === categoryId);
      
      if (selectedCategory && selectedCategory.defaultColor) {
        this.eventForm.get('settingsDetails.color')?.setValue(selectedCategory.defaultColor);
      }
    });

    if (this.data && this.data.event) {
      this.isEditMode.set(true);
      const ev = this.data.event;

      this.eventForm.get('basicDetails')?.patchValue({
        eventName: ev.eventName,
        description: ev.description
      });
      
      this.eventForm.get('categoryDetails')?.patchValue({
        categoryId: ev.category
      });

      let fromDate: Date;
      let toDate: Date;

      if (ev.isAllDay) {
        const utcFrom = new Date(ev.fromDate);
        const utcTo = new Date(ev.toDate);
        fromDate = new Date(utcFrom.getUTCFullYear(), utcFrom.getUTCMonth(), utcFrom.getUTCDate());
        toDate = new Date(utcTo.getUTCFullYear(), utcTo.getUTCMonth(), utcTo.getUTCDate());
      } else {
        fromDate = new Date(ev.fromDate);
        toDate = new Date(ev.toDate);
      }

      const startTime = this.extractTime(fromDate);
      const endTime = this.extractTime(toDate);

      this.eventForm.get('timeDetails')?.patchValue({
        isAllDay: ev.isAllDay,
        startDate: fromDate,
        startTime: startTime,
        endDate: toDate,
        endTime: endTime
      });

      if (ev.recurrence) {
        const isReallyRecurring = ev.recurrence.frequency !== 'NONE' && ev.recurrence.frequency !== 'none';

        this.eventForm.get('recurrenceDetails')?.patchValue({
          isRecurring: isReallyRecurring,
          frequency: isReallyRecurring ? ev.recurrence.frequency : 'none',
          daysOfWeek: ev.recurrence.daysOfWeek || [],
          untilDate: ev.recurrence.untilDate ? new Date(ev.recurrence.untilDate) : ''
        });
      }

      this.eventForm.get('settingsDetails')?.patchValue({
        color: ev.color || '#3b82f6',
        //sendNotification: ev.sendNotification || false,
        //allowOverlap: ev.allowOverlap || false
      });
    }
    this.cdr.detectChanges();
  }

  private extractTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  onSubmit() {
    if (this.eventForm.valid) {
      const basic = this.eventForm.get('basicDetails')?.getRawValue();
      const catDetails = this.eventForm.get('categoryDetails')?.getRawValue();
      const time = this.eventForm.get('timeDetails')?.getRawValue();
      const rec = this.eventForm.get('recurrenceDetails')?.getRawValue();
      const targetEndDate = time.endDate ? time.endDate : time.startDate;
      const sTime = time.isAllDay ? '00:00' : time.startTime;
      const eTime = time.isAllDay ? '23:59' : time.endTime;
      const fullFromDate = this.combineDateAndTime(time.startDate, sTime, time.isAllDay);
      const fullToDate = this.combineDateAndTime(targetEndDate, eTime, time.isAllDay);
      const settings = this.eventForm.get('settingsDetails')?.getRawValue();

      const payload: AppEvent = {
        eventName: basic.eventName,
        description: basic.description,
        category: catDetails.categoryId,
        isAllDay: time.isAllDay,
        fromDate: fullFromDate,
        toDate: fullToDate,
        color: settings.color,
        //sendNotification: settings.sendNotification,
        //allowOverlap: settings.allowOverlap
      };

      if (rec.isRecurring && rec.frequency !== 'none') {
        payload.recurrence = {
          frequency: rec.frequency,
          daysOfWeek: rec.daysOfWeek,
          untilDate: rec.untilDate ? new Date(rec.untilDate) : null
        };
      } else {
        payload.recurrence = {
          frequency: 'NONE'
        }
      }

      if (this.isEditMode() && this.data?.event?._id) {
        this.eventService.updateEvent(this.data.event._id, payload).subscribe({
          next: (res) => {
            this.dialogRef.close(true);
          },
          error: (err) => console.error('Hiba az esemény frissítésekor:', err)
        });
      } else {
        this.eventService.createEvent(payload).subscribe({
          next: (res) => {
            this.dialogRef.close(true);
          },
          error: (err) => console.error('Hiba az esemény létrehozásakor:', err)
        });
      }
    }
  }

  onDelete() {
    if (this.isEditMode() && this.data?.event?._id) {
      const confirmDialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '500px',
        maxWidth: '90vw',
        restoreFocus: false,
        autoFocus: false,
        data: {
          title: 'Esemény törlése',
          message: 'Biztosan törölni szeretnéd ezt az eseményt? Ezt a műveletet nem lehet visszavonni.',
          confirmText: 'Törlés',
          cancelText: 'Mégsem',
          color: 'warn' 
        }
      });

      confirmDialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.eventService.deleteEvent(this.data!.event!._id!).subscribe({
            next: () => {
              this.dialogRef.close(true);
            },
            error: (err) => console.error('Hiba az esemény törlésekor:', err)
          });
        }
      });      
    }
  }

  private combineDateAndTime(date: Date, time: string, isAllDay: boolean = false): Date {
    if (!date) return new Date();
    const timeStr = time || '00:00';
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    if (isAllDay) {
      return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0));
    } else {
      const combined = new Date(date);
      combined.setHours(hours, minutes, 0, 0);
      return combined;
    }
  }
}