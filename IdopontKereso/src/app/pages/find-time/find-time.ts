import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../services/event/event.service';
import { GroupService } from '../../services/group/group.service'; 
import { TimeSearchParams, TimeSlot } from '../../models/findtime.model';
import { Group } from '../../models/group.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-find-time',
  standalone: true,
  imports: [DatePipe, SlicePipe, FormsModule,MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule,
    MatCheckboxModule, MatButtonModule],
  templateUrl: './find-time.html',
  styleUrls: ['./find-time.scss']
})
export class FindTime implements OnInit {
  private eventService = inject(EventService);
  private groupService = inject(GroupService);

  availableSlots = signal<TimeSlot[]>([]);
  groups = signal<Group[]>([]);
  selectedGroupId = signal<string>('');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  
  weekDays = [
    { value: 1, label: 'Hétfő' },
    { value: 2, label: 'Kedd' },
    { value: 3, label: 'Szerda' },
    { value: 4, label: 'Csütörtök' },
    { value: 5, label: 'Péntek' },
    { value: 6, label: 'Szombat' },
    { value: 0, label: 'Vasárnap' }
  ];

  searchParams = {
    searchStart: new Date(), 
    searchEnd: new Date(new Date().setDate(new Date().getDate() + 7)), 
    durationMinutes: 30,
    durationDays: 0,
    requiredAttendees: [] as string[],
    optionalAttendees: [] as string[],
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    startHour: 9,
    endHour: 17,
    allowedDays: [1, 2, 3, 4, 5]
  };

  selectedGroupMembers = signal<any[]>([]);

  ngOnInit() {
    this.loadUserGroups();
  }

  loadUserGroups() {
    this.groupService.getGroups().subscribe({
      next: (groupsData) => {
        this.groups.set(groupsData);
      },
      error: (err) => {
        console.error('Hiba a csoportok betöltésekor', err);
        this.errorMessage.set('Hiba történt a csoportok betöltésekor.');
      }
    });
  }

  onGroupSelected(groupId: string) {
    this.selectedGroupId.set(groupId);
    
    const selectedGroup = this.groups().find(g => g._id === groupId);
    
    if (selectedGroup && selectedGroup.members) {
      const membersList = selectedGroup.members.map((member: any) => {
        const id = typeof member.userId === 'object' && member.userId !== null 
          ? member.userId._id 
          : member.userId;
        
        const name = typeof member.userId === 'object' && member.userId !== null 
          ? (member.userId.fullName || member.userId.userName || 'Ismeretlen felhasználó') 
          : 'Ismeretlen felhasználó';
          
        return { id, name };
      });

      this.selectedGroupMembers.set(membersList);
      this.searchParams.requiredAttendees = membersList.map((m: any) => m.id);
      this.searchParams.optionalAttendees = []; 
    } else {
      this.selectedGroupMembers.set([]);
      this.searchParams.requiredAttendees = [];
      this.searchParams.optionalAttendees = [];
    }
  }

  // Frissítve: HTML Event helyett MatCheckboxChange
  toggleAttendeeRequirement(memberId: string, event: MatCheckboxChange) {
    const isChecked = event.checked;
    
    if (isChecked) {
      if (!this.searchParams.requiredAttendees.includes(memberId)) {
         this.searchParams.requiredAttendees.push(memberId);
      }
      this.searchParams.optionalAttendees = this.searchParams.optionalAttendees?.filter(id => id !== memberId) || [];
    } else {
      this.searchParams.requiredAttendees = this.searchParams.requiredAttendees.filter(id => id !== memberId);
      if (!this.searchParams.optionalAttendees?.includes(memberId)) {
         this.searchParams.optionalAttendees?.push(memberId);
      }
    }
  }

  toggleDay(dayValue: number) {
    const index = this.searchParams.allowedDays.indexOf(dayValue);
    if (index > -1) {
      this.searchParams.allowedDays.splice(index, 1);
    } else {
      this.searchParams.allowedDays.push(dayValue);
    }
  }

  searchTimeSlots() {
    if (this.searchParams.requiredAttendees.length === 0) {
      this.errorMessage.set('Kérlek, válassz ki egy csoportot!');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const offsetHours = new Date().getTimezoneOffset() / 60;

    // Feltuningolt dátum-előkészítő függvény
    // A kezdő dátumot a nap elejére (00:00:00), a végdátumot a nap végére (23:59:59) igazítja UTC-ben,
    // így a backend adatbázis lekérdezése biztosan behúzza az adott napra eső összes eseményt.
    const getAdjustedDate = (date: Date, isEnd: boolean) => {
      const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      if (isEnd) {
        adjusted.setUTCHours(23, 59, 59, 999);
      } else {
        adjusted.setUTCHours(0, 0, 0, 0);
      }
      return adjusted;
    };

    const paramsToSubmit: TimeSearchParams = {
      ...this.searchParams,
      searchStart: getAdjustedDate(this.searchParams.searchStart, false),
      searchEnd: getAdjustedDate(this.searchParams.searchEnd, true),
      
      startHour: (this.searchParams.startHour ?? 9) + offsetHours,
      endHour: (this.searchParams.endHour ?? 17) + offsetHours
    };

    this.eventService.findAvailableTimeSlots(paramsToSubmit).subscribe({
      next: (response) => {
        if (response.success) {
          this.availableSlots.set(response.data); 
        } else {
          this.errorMessage.set('Nem sikerült időpontokat találni.');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Keresési hiba:', err);
        this.errorMessage.set('Hiba történt a szerverrel való kommunikáció során.');
        this.isLoading.set(false);
      }
    });
  }

  selectSlot(slot: TimeSlot) {
    console.log('Kiválasztott időpont:', slot);
  }
}