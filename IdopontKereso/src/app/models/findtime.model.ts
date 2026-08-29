export interface TimeSearchParams {
  searchStart: string | Date;
  searchEnd: string | Date;
  durationMinutes: number;
  durationDays?: number;
  requiredAttendees: string[];
  optionalAttendees?: string[];
  bufferMinutes?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  startHour?: number;
  endHour?: number;
  allowedDays?: number[];
}

export interface TimeSlot {
  start: string | Date;
  end: string | Date;
  availableOptionalCount?: number;
}

export interface TimeSearchResponse {
  success: boolean;
  count: number;
  data: TimeSlot[];
}