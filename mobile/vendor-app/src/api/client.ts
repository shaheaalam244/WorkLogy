import { CONFIG } from '../config';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import type { User, Job, Booking, VendorProfile, ChatMessage } from '../types';

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
        body: JSON.stringify({ ...userData, role: 'vendor' }),
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

  // Jobs & Tenders
  jobs: {
    getOpenJobs: async (params?: { urgency?: string }) => {
      const query = params?.urgency ? `?urgency=${params.urgency}` : '';
      return await request<{ success: boolean; count: number; jobs: Job[] }>(`/jobs/open${query}`);
    },

    claimEmergencyLead: async (jobId: string) => {
      return await request<{ success: boolean; message: string; booking: Booking }>(`/jobs/${jobId}/claim-instant`, {
        method: 'POST'
      });
    },

    submitProposal: async (jobId: string, data: { amount: number; coverLetter?: string }) => {
      return await request<{ success: boolean; message: string }>(`/jobs/${jobId}/proposals`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  },

  // Bookings & Field Tasks
  bookings: {
    getMyBookings: async (params?: { status?: string }) => {
      const query = params?.status ? `?status=${params.status}` : '';
      return await request<{ success: boolean; count: number; bookings: Booking[] }>(`/bookings/my-bookings${query}`);
    },

    updateStatus: async (id: string, status: string, notes?: string) => {
      return await request<{ success: boolean; message: string; booking: Booking }>(`/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes })
      });
    },

    verifyArrivalOtp: async (id: string, otp: string) => {
      return await request<{ success: boolean; message: string; booking: Booking }>(`/bookings/${id}/verify-arrival-otp`, {
        method: 'POST',
        body: JSON.stringify({ otp })
      });
    },

    completeSignoff: async (id: string, data?: { feedback?: string }) => {
      return await request<{ success: boolean; message: string; booking: Booking }>(`/bookings/${id}/complete-signoff`, {
        method: 'POST',
        body: JSON.stringify(data || {})
      });
    }
  },

  // Vendor Management & Financials
  vendors: {
    getProfile: async () => {
      return await request<{ success: boolean; vendor: VendorProfile }>('/vendors/profile/me');
    },

    toggleAvailability: async (isAvailable: boolean) => {
      return await request<{ success: boolean; availability: any }>('/vendors/availability', {
        method: 'PUT',
        body: JSON.stringify({ isAvailableNow: isAvailable })
      });
    },

    getEarnings: async () => {
      return await request<{ success: boolean; earnings: any }>('/vendors/earnings');
    },

    getTransactions: async (params?: { status?: string }) => {
      const query = params?.status ? `?status=${params.status}` : '';
      return await request<{ success: boolean; count: number; transactions: any[] }>(`/vendors/transactions${query}`);
    },

    requestVerification: async (data: { idType: string; documentUrl?: string; statutoryConsent: boolean }) => {
      return await request<{ success: boolean; message: string }>('/vendors/verification', {
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
