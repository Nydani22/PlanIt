import { CategoryColor } from "./category.model";
import { User } from "./user.model";

export interface Recurrence {
  frequency: 'NONE' | 'DAILY' | 'WEEKLY' | string;
  daysOfWeek?: number[];
  untilDate?: Date | string | null;
  cancelledDates?: (Date | string)[];
}

export interface Attendee {
  userId: User | string;
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
  
  color?: CategoryColor | string; 
  isExternal?: boolean;
  organizerId?: string;
  groupId?: string;
  recurrence?: Recurrence | null;
  attendees?: Attendee[];
  sendNotification?: boolean;
  allowOverlap?: boolean;
  
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface UserStatsResponse {
  weekly: { eventCount: number; hours: number; busyPercentage: number };
  monthly: { eventCount: number; hours: number; busyPercentage: number };
  upcomingEvents: upcomingEvents[];
}

export interface upcomingEvents {
  id: string;
  title: string;
  date: string;
  color: string;
}