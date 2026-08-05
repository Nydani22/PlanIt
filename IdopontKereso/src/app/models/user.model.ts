export interface UserSettings {
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
  externalCalendarUrl: string | null;
  calendarFeedToken: string | null;
  settings: UserSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface TokenResponse {
  success: boolean;
  message: string;
  token: string;
}