import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CalendarViewComponent } from "../../components/calendar-view/calendar-view";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Event } from '../../services/event';
import { Auth } from '../../services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [CalendarViewComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDatepickerModule],
  providers: [provideNativeDateAdapter()],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  eventForm: FormGroup;
  successMessage = signal('');

  constructor(private fb: FormBuilder, private eventService: Event, private authService: Auth, private router: Router) {
    this.eventForm = this.fb.group({
      eventName: ['', Validators.required],
      description: ['', Validators.required],
      
      startDate: ['', Validators.required],
      startTime: ['08:00', Validators.required],
      
      endDate: ['', Validators.required],
      endTime: ['09:00', Validators.required]
    });
  }

  onSubmit() {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']); 
    }
    if (this.eventForm.valid) {
      const formValue = this.eventForm.value;
      const fullFromDate = this.combineDateAndTime(formValue.startDate, formValue.startTime);
      const fullToDate = this.combineDateAndTime(formValue.endDate, formValue.endTime);
      const payload = {
        eventName: formValue.eventName,
        description: formValue.description,
        fromDate: fullFromDate,
        toDate: fullToDate
      };

      this.eventService.createEvent(payload).subscribe({
        next: (res) => {
          this.successMessage.set('Esemény sikeresen rögzítve!');
          this.eventForm.reset({
             startTime: '08:00',
             endTime: '09:00'
          });
        },
        error: (err) => {
          console.error(err);
        }
      });
    }
  }

  
  private combineDateAndTime(date: Date, time: string): Date {
    const combined = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    combined.setHours(hours);
    combined.setMinutes(minutes);
    return combined;
  }
}