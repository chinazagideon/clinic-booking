import {
  Slot,
  SlotWithAvailability,
  NewBooking,
  Booking,
  BookingsPageResponse,
  SlotsResponse,
  ApiError,
} from '../types/api';

// Configured strictly from environment variables
const API_KEY = (import.meta.env.VITE_API_KEY as string) || '';

// In dev, Vite proxies /api to http://localhost:8000.
const BASE_URL = '/api';

async function request<T>(
  path: string,
  options: RequestInit = {},
  customHeaders: Record<string, string> = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    ...customHeaders,
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string>),
    },
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let retryAfter: number | undefined;

    const retryHeader = response.headers.get('Retry-After');
    if (retryHeader) {
      const parsed = parseInt(retryHeader, 10);
      if (!isNaN(parsed)) retryAfter = parsed;
    }

    try {
      const json = await response.json();
      if (json && typeof json.error === 'string') {
        errorMessage = json.error;
      }
    } catch {
      // Non-JSON response
    }

    const err: ApiError = {
      error: errorMessage,
      status: response.status,
      retryAfter,
    };
    throw err;
  }

  // Handle 200/201 responses with no content or JSON
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return {} as T;
}

export const clinicApi = {
  // GET /slots
  async getSlots(provider?: string): Promise<SlotWithAvailability[]> {
    const params = new URLSearchParams();
    if (provider && provider.trim()) {
      params.append('provider', provider.trim());
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await request<SlotsResponse>(`/slots${query}`, { method: 'GET' });
    return data.slots || [];
  },

  // POST /bookings
  async createBooking(booking: NewBooking, idempotencyKey?: string): Promise<Booking> {
    const customHeaders: Record<string, string> = {};
    if (idempotencyKey) {
      customHeaders['Idempotency-Key'] = idempotencyKey;
    }
    return await request<Booking>(
      '/bookings',
      {
        method: 'POST',
        body: JSON.stringify(booking),
      },
      customHeaders
    );
  },

  // GET /bookings
  async getBookings(
    email: string,
    limit: number = 10,
    cursor?: string | null
  ): Promise<BookingsPageResponse> {
    const params = new URLSearchParams();
    params.append('email', email.trim());
    params.append('limit', limit.toString());
    if (cursor) {
      params.append('cursor', cursor);
    }
    return await request<BookingsPageResponse>(`/bookings?${params.toString()}`, {
      method: 'GET',
    });
  },

  // GET /bookings/{id}
  async getBooking(id: string): Promise<Booking> {
    return await request<Booking>(`/bookings/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  },

  // DELETE /bookings/{id}
  async cancelBooking(id: string): Promise<Booking> {
    return await request<Booking>(`/bookings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // POST /reset
  async resetSlots(slots: Slot[]): Promise<void> {
    await request<void>('/reset', {
      method: 'POST',
      body: JSON.stringify({ slots }),
    });
  },
};
