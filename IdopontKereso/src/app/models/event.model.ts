import { CategoryColor } from "./category.model";

export interface Recurrence {
  frequency: 'NONE' | 'DAILY' | 'WEEKLY' | string;
  daysOfWeek?: number[];
  untilDate?: Date | string | null;
  cancelledDates?: (Date | string)[];
}

export interface Attendee {
  userId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | string;
  attendanceType: 'REQUIRED' | 'OPTIONAL' | string;
}

export interface AppEvent {
  _id?: string;
  eventName: string;
  description?: string;
  location?: string;
  isAllDay: boolean;
  fromDate: Date | string;
  toDate: Date | string;
  timezone?: string;
  category: string;
  
  color?: CategoryColor; 
  
  organizerId?: string;
  groupId?: string;
  recurrence?: Recurrence | null;
  attendees?: Attendee[];
  
  createdAt?: Date | string;
  updatedAt?: Date | string;
}