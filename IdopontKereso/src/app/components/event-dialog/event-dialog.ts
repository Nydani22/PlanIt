import { Component, inject, signal, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
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
import { BreakpointObserver } from '@angular/cdk/layout';
import { AuthService } from '../../services/auth/auth.service';
import { GroupService } from '../../services/group/group.service';
import { SnackbarService } from '../../services/snackbar/snackbar.service';

export interface EventDialogData {
  event?: AppEvent;
  isGroupAdmin?: boolean;
}

export const dateRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const startDate = control.get('startDate')?.value;
  const endDate = control.get('endDate')?.value;
  const startTime = control.get('startTime')?.value;
  const endTime = control.get('endTime')?.value;
  const isAllDay = control.get('isAllDay')?.value;

  if (!startDate) return null;

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(startDate);

  if (!isAllDay) {
    if (startTime) {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      start.setHours(startHour, startMinute, 0, 0);
    }
    if (endTime) {
      const [endHour, endMinute] = endTime.split(':').map(Number);
      end.setHours(endHour, endMinute, 0, 0);
    }
  } else {
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
  }

  if (start.getTime() > end.getTime()) {
    const isRecurring = control.parent?.get('recurrenceDetails.isRecurring')?.value;
    
    if (isRecurring) {
      return null; 
    }
    
    return { dateRangeInvalid: true };
  }
  
  return null;
};

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./event-dialog.scss']
})
export class EventDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private eventService = inject(EventService);
  private dialogRef = inject(MatDialogRef<EventDialogComponent>);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);
  public data = inject<EventDialogData>(MAT_DIALOG_DATA, { optional: true }); 
  private breakpointObserver = inject(BreakpointObserver);
  private authService = inject(AuthService);
  private groupService = inject(GroupService);
  private snackbarService = inject(SnackbarService)
  canEdit = signal<boolean>(true);
  eventForm: FormGroup;
  isEditMode = signal<boolean>(false);
  isUpdateMode: boolean = false;
  hideTimeSteps = signal<boolean>(false);
  categoriesList: CategoryDefinition[] = FIXED_CATEGORIES;
  isMobile = signal<boolean>(false);

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
    this.breakpointObserver.observe('(max-width: 640px)').subscribe(result => {
      this.isMobile.set(result.matches);
    });

    const today = new Date();
    const otherCategory = this.categoriesList.find(cat => cat.id === 'OTHER');
    const defaultColor = otherCategory?.defaultColor || '#3b82f6';

    this.eventForm = this.fb.group({
      basicDetails: this.fb.group({
        eventName: ['', Validators.required],
        description: ['']
      }),
      categoryDetails: this.fb.group({
        categoryId: [otherCategory?.id, Validators.required]
      }),
      timeDetails: this.fb.group({
        isAllDay: [false],
        startDate: [today, Validators.required],
        startTime: ['08:00'],
        endDate: [today, Validators.required],
        endTime: ['09:00']
      }, { validators: dateRangeValidator }), 
      recurrenceDetails: this.fb.group({
        isRecurring: [false],
        frequency: ['none'],
        daysOfWeek: [[]],
        untilDate: ['']
      }),
      settingsDetails: this.fb.group({
        color: [defaultColor],
        sendNotification: [false],
        allowOverlap: [false]
      })
    });
  }

  ngOnInit() {
    const ev = this.data?.event;

    this.setupModeAndVisibility(ev);

    this.setupFormSubscriptions();

    if (ev) {
      this.patchEventData(ev);
    }
    
  }


  private setupModeAndVisibility(ev?: AppEvent) {
    if (!ev) return;

    if (ev._id) {
      this.isUpdateMode = true;
      this.isEditMode.set(true);

      const currentUserId = this.authService.getCurrentUserId();
      const isOrganizer = ev.organizerId === currentUserId;
      
      if (ev.isExternal) {
        this.canEdit.set(false);
        this.eventForm.disable();
      } else if (ev.groupId) {
        this.groupService.isUserAdminOfGroup(ev.groupId, currentUserId).subscribe(isAdmin => {
          if (!isOrganizer && !isAdmin) {
            this.canEdit.set(false);
            this.eventForm.disable();
          }
        });
      } else {
        if (!isOrganizer) {
          this.canEdit.set(false);
          this.eventForm.disable();
        }
      }

      if (ev.attendees && ev.attendees.length > 1) {
        this.hideTimeSteps.set(true);
      }
    } else if (!ev._id && ev.attendees && ev.attendees.length > 0) {
      this.hideTimeSteps.set(true);
    }
  }

  private setupFormSubscriptions() {
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
        if (this.canEdit()) {
          startTimeCtrl?.enable();
          endTimeCtrl?.enable();
        }
      }
    });

    this.eventForm.get('categoryDetails.categoryId')?.valueChanges.subscribe(categoryId => {
      const selectedCategory = this.categoriesList.find(cat => cat.id === categoryId);
      
      if (selectedCategory && selectedCategory.defaultColor) {
        this.eventForm.get('settingsDetails.color')?.setValue(selectedCategory.defaultColor);
      }
    });
  }

  private patchEventData(ev: AppEvent) {
    this.eventForm.get('basicDetails')?.patchValue({
      eventName: ev.eventName || '',
      description: ev.description || ''
    });
    
    if (ev.category) {
      this.eventForm.get('categoryDetails')?.patchValue({
        categoryId: ev.category
      });
    }

    const fromDate = new Date(ev.fromDate);
    const toDate = new Date(ev.toDate);

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
    });
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
      if (rec.isRecurring && fullFromDate.getTime() > fullToDate.getTime()) {
        fullToDate.setDate(fullToDate.getDate() + 1);
      }
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

      if (this.data?.event?.attendees) {
        payload.attendees = this.data.event.attendees;
      }

      if (this.data?.event?.groupId) {
        payload.groupId = this.data.event.groupId;
      }

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
          error: (err) => {
            this.snackbarService.showError("Hiba az esemény frissítésekor.");
          }
        });
      } else {
        this.eventService.createEvent(payload).subscribe({
          next: (res) => {
            this.dialogRef.close(true);
          },
          error: (err) => {
            this.snackbarService.showError("Hiba az esemény létrehozásakor.");
          }
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
            error: (err) => {
             this.snackbarService.showError("Hiba az esemény törlésekor.") 
            }
          });
        }
      });      
    }
  }

  private combineDateAndTime(date: Date, time: string, isAllDay: boolean = false): Date {
    if (!date) return new Date();
    const timeStr = time || '00:00';
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }
}