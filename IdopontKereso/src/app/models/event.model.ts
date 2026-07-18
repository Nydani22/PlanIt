export interface Recurrence {
  frequency: string;
  daysOfWeek?: number[];
  untilDate?: Date | string | null;
}

export interface AppEvent {
  _id?: string;
  eventName: string;
  description: string;
  isAllDay: boolean;
  fromDate: Date | string;
  toDate: Date | string;
  recurrence?: Recurrence;
}