export interface Slot {
  id: string;
  provider: string;
  start: string;
  end: string;
}

export interface SlotWithAvailability extends Slot {
  available: boolean;
}

export interface NewBooking {
  slot_id: string;
  name: string;
  email: string;
}

export type BookingStatus = 'confirmed' | 'cancelled';

export interface Booking {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  status: BookingStatus;
  created_at: string;
}

export interface BookingsPageResponse {
  bookings: Booking[];
  next_cursor: string | null;
}

export interface SlotsResponse {
  slots: SlotWithAvailability[];
}

export interface ApiError {
  error: string;
  status?: number;
  retryAfter?: number;
}
