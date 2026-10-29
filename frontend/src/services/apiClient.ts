import {
  Slot,
  SlotWithAvailability,
  NewBooking,
  Booking,
  BookingCreationResult,
  BookingsPageResponse,
  SlotsResponse,
  ApiError,
} from '../types/api';

// Configured strictly from environment variables
const API_KEY = (import.meta.env.VITE_API_KEY as string) || '';

/**
 * Resolves the backend base URL dynamically from environment.
 */
function getBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_BACKEND_URL as string)?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return '';
}

interface ApiResponseWithMeta<T> {
  data: T;
  headers: Headers;
  status: number;
}

async function requestWithMeta<T>(
  path: string,
  options: RequestInit = {},
  customHeaders: Record<string, string> = {}
): Promise<ApiResponseWithMeta<T>> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    const missingUrlError: ApiError = {
      error: 'Backend API URL is not configured. Please define VITE_BACKEND_URL in your environment.',
      status: 0,
    };
    throw missingUrlError;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    ...customHeaders,
  };

  const url = `${baseUrl}${path}`;

  try {
    const response = await fetch(url, {
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
        // Non-JSON response (e.g. 404 from proxy or gateway)
        if (response.status === 404) {
          errorMessage = `Endpoint ${path} returned 404 Not Found at ${baseUrl}.`;
        }
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
    let data = {} as T;
    if (contentType && contentType.includes('application/json')) {
      data = (await response.json()) as T;
    }

    return {
      data,
      headers: response.headers,
      status: response.status,
    };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    const networkErr: ApiError = {
      error: (err as Error)?.message || 'Failed to connect to backend server.',
      status: 0,
    };
    throw networkErr;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  customHeaders: Record<string, string> = {}
): Promise<T> {
  const res = await requestWithMeta<T>(path, options, customHeaders);
  return res.data;
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
  async createBooking(
    booking: NewBooking,
    idempotencyKey?: string
  ): Promise<BookingCreationResult> {
    const customHeaders: Record<string, string> = {};
    if (idempotencyKey) {
      customHeaders['Idempotency-Key'] = idempotencyKey;
    }
    const response = await requestWithMeta<Booking>(
      '/bookings',
      {
        method: 'POST',
        body: JSON.stringify(booking),
      },
      customHeaders
    );
    const isReplayed =
      response.headers.get('Idempotent-Replayed') === 'true' ||
      response.headers.get('idempotent-replayed') === 'true';
    return {
      booking: response.data,
      isReplayed,
    };
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
