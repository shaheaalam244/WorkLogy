import { CONFIG } from '../config';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import type { User, ServiceCategory, Job, Booking, ReviewItem, ChatMessage, ServiceAddress } from '../types';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { requiresAuth = true, ...fetchOptions } = options;
  const url = `${CONFIG.API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>)
  };

  if (requiresAuth) {
    const token = await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || `HTTP error ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  auth: {
    login: async (credentials: { email: string; password: string }) => {
      const data = await request<{ success: boolean; token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
        requiresAuth: false
      });
      if (data.token) {
        await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
        await secureStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(data.user));
      }
      return data;
    },

    register: async (userData: { name: string; email: string; phone?: string; password: string; role?: string }) => {
      const data = await request<{ success: boolean; token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...userData, role: 'customer' }),
        requiresAuth: false
      });
      if (data.token) {
        await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
        await secureStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(data.user));
      }
      return data;
    },

    getCurrentUser: async () => {
      return await request<{ success: boolean; user: User }>('/auth/me');
    },

    switchRole: async (role: 'customer' | 'vendor') => {
      return await request<{ success: boolean; user: User; token?: string }>('/auth/role', {
        method: 'PATCH',
        body: JSON.stringify({ role })
      });
    },

    logout: async () => {
      await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await secureStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    }
  },

  // Categories
  categories: {
    getAll: async () => {
      return await request<{ success: boolean; categories: ServiceCategory[] }>('/categories', {
        requiresAuth: false
      });
    },

    getBySlug: async (slug: string) => {
      return await request<{ success: boolean; category: ServiceCategory }>(`/categories/${slug}`, {
        requiresAuth: false
      });
    }
  },

  // Jobs
  jobs: {
    createJob: async (jobData: Partial<Job>) => {
      return await request<{ success: boolean; job: Job; message?: string }>('/jobs', {
        method: 'POST',
        body: JSON.stringify(jobData)
      });
    },

    getMyJobs: async (params?: { status?: string }) => {
      const query = params?.status ? `?status=${params.status}` : '';
      return await request<{ success: boolean; count: number; jobs: Job[] }>(`/jobs/my-jobs${query}`);
    },

    cancelJob: async (id: string, reason?: string) => {
      return await request<{ success: boolean; message: string }>(`/jobs/${id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason })
      });
    }
  },

  // Bookings
  bookings: {
    getMyBookings: async (params?: { status?: string }) => {
      const query = params?.status ? `?status=${params.status}` : '';
      return await request<{ success: boolean; count: number; bookings: Booking[] }>(`/bookings/my-bookings${query}`);
    },

    getBookingById: async (id: string) => {
      return await request<{ success: boolean; booking: Booking }>(`/bookings/${id}`);
    },

    cancelBooking: async (id: string, reason: string) => {
      return await request<{ success: boolean; message: string; booking: Booking }>(`/bookings/${id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason })
      });
    }
  },

  // Customer Addresses
  customer: {
    getAddresses: async () => {
      return await request<{ success: boolean; addresses: ServiceAddress[] }>('/customer/addresses');
    },

    addAddress: async (address: ServiceAddress) => {
      return await request<{ success: boolean; address: ServiceAddress }>('/customer/addresses', {
        method: 'POST',
        body: JSON.stringify(address)
      });
    }
  },

  // Reviews
  reviews: {
    submit: async (data: { booking: string; rating: number; title?: string; comment: string }) => {
      return await request<{ success: boolean; review: ReviewItem }>('/reviews', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  },

  // Chat
  chat: {
    getMessages: async (conversationId: string) => {
      return await request<{ success: boolean; messages: ChatMessage[] }>(`/chat/conversations/${conversationId}/messages`);
    },

    sendMessage: async (data: { receiverId: string; text: string; conversationId?: string }) => {
      return await request<{ success: boolean; message: ChatMessage }>('/chat/messages', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  }
};
