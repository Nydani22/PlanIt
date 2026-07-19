export interface UserSettings {
  timezone: string;
  defaultView: 'month' | 'week' | 'day';
  dayStartHour: number;
  dayEndHour: number;
  hideWeekends: boolean;
  hourSegments: number;
}

export interface User {
  _id?: string;
  userName: string;
  email: string;
  fullName: string;
  password?: string;
  settings: UserSettings;
  createdAt?: string;
  updatedAt?: string;
}