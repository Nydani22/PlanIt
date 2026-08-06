export interface ExternalCalendar {
  _id?: string;
  name: string;
  url: string;
  color: string;
}

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
  externalCalendars?: ExternalCalendar[];
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