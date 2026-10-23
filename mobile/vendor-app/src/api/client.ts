import { CONFIG } from '../config';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import type { User, Job, Booking, VendorProfile, ChatMessage, ServiceCategory } from '../types';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export async function getStoredAuthToken(): Promise<string | null> {
  const primary = await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (primary && typeof primary === 'string' && primary.trim().length > 0) {
    return primary.trim();
  }

  for (const altKey of ['worklogy_token', 'token', 'worklogy_auth_token']) {
    const alt = await secureStorage.getItem(altKey);
    if (alt && typeof alt === 'string' && alt.trim().length > 0) {
      return alt.trim();
    }
  }

  return null;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { requiresAuth = true, ...fetchOptions } = options;
  const url = `${CONFIG.API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>)
  };

  if (requiresAuth) {
    const token = await getStoredAuthToken();
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

  // Categories
  categories: {
    getAll: async () => {
      return await request<{ success: boolean; count: number; categories: ServiceCategory[] }>('/categories', {
        requiresAuth: false
      });
    }
  },

  // Jobs & Tenders
  jobs: {
    getOpenJobs: async (params?: { urgency?: string; category?: string; tab?: string; locality?: string; page?: number; limit?: number; search?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.urgency) searchParams.append('urgency', params.urgency);
      if (params?.category) searchParams.append('category', params.category);
      if (params?.tab) searchParams.append('tab', params.tab);
      if (params?.locality) searchParams.append('locality', params.locality);
      if (params?.page) searchParams.append('page', String(params.page));
      if (params?.limit) searchParams.append('limit', String(params.limit));
      if (params?.search) searchParams.append('search', params.search);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return await request<{
        success: boolean;
        count?: number;
        total?: number;
        page?: number;
        totalPages?: number;
        jobs: Job[];
        counts?: { allAvailable: number; new: number; open: number; assignedToMe: number; cancelled: number };
        vendorCoverage?: {
          city: string;
          localities: string[];
          hasCityWide: boolean;
          approvedCategoriesCount: number;
          categories: any[];
        };
        configurationStatus?: 'ready' | 'missing_categories' | 'missing_service_area';
        vendorEligibility?: {
          approvalStatus: string;
          canClaim: boolean;
          reason: string;
        };
        message?: string;
      }>(`/jobs/nearby${query}`);
    },

    getJobDetails: async (jobId: string) => {
      return await request<{ success: boolean; job: Job }>(`/jobs/${jobId}`);
    },

    claimEmergencyLead: async (jobId: string) => {
      return await request<{ success: boolean; message: string; booking: Booking }>(`/jobs/${jobId}/claim-instant`, {
        method: 'POST'
      });
    },

    acceptJob: async (jobId: string, data: any = {}) => {
      return await request<{ success: boolean; message: string; booking: Booking }>(`/jobs/${jobId}/accept`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    submitProposal: async (jobId: string, data: {
      proposedAmount?: number;
      amount?: number;
      coverLetter?: string;
      estimatedDuration?: string;
      materialCharges?: number;
      pricingBasis?: string;
    }) => {
      const finalAmount = data.proposedAmount || data.amount || 0;
      return await request<{ success: boolean; message: string }>('/applications', {
        method: 'POST',
        body: JSON.stringify({ jobId, proposedAmount: finalAmount, ...data })
      });
    }
  },

  // Applications / Quotes
  applications: {
    getMyApplications: async () => {
      return await request<{ success: boolean; count: number; applications: any[] }>('/applications/vendor');
    },

    withdraw: async (id: string) => {
      return await request<{ success: boolean; message: string }>(`/applications/${id}/withdraw`, {
        method: 'PATCH'
      });
    }
  },

  // Bookings & Field Tasks
  bookings: {
    getMyBookings: async (params?: { status?: string }) => {
      const query = params?.status ? `?status=${params.status}` : '';
      return await request<{ success: boolean; count: number; bookings: Booking[] }>(`/bookings/my-bookings${query}`);
    },

    getById: async (id: string) => {
      return await request<{ success: boolean; booking: Booking }>(`/bookings/${id}`);
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
    },

    respondDirectBooking: async (id: string, action: 'accept' | 'decline', reason?: string) => {
      return await request<{ success: boolean; message: string; booking: Booking }>(`/bookings/${id}/respond`, {
        method: 'PATCH',
        body: JSON.stringify({ action, reason })
      });
    }
  },

  // Service Offerings & Listings Management
  services: {
    getMyServices: async (params?: { status?: string }) => {
      const query = params?.status && params.status !== 'all' ? `?status=${params.status}` : '';
      return await request<{ success: boolean; count: number; services: any[] }>(`/vendors/services/my${query}`);
    },

    getById: async (id: string) => {
      return await request<{ success: boolean; service: any }>(`/vendors/services/${id}`);
    },

    create: async (data: any) => {
      return await request<{ success: boolean; message: string; service: any }>('/vendors/services', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    update: async (id: string, data: any) => {
      return await request<{ success: boolean; message: string; service: any }>(`/vendors/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    updateStatus: async (id: string, status: string) => {
      return await request<{ success: boolean; message: string; service: any }>(`/vendors/services/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    },

    delete: async (id: string) => {
      return await request<{ success: boolean; message: string }>(`/vendors/services/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Vendor Management & Financials
  vendors: {
    getProfile: async () => {
      return await request<{ success: boolean; vendor: VendorProfile }>('/vendors/profile/me');
    },

    updateProfile: async (data: Partial<VendorProfile>) => {
      return await request<{ success: boolean; vendor: VendorProfile }>('/vendors/profile/me', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
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

  // Notifications
  notifications: {
    getAll: async () => {
      return await request<{ success: boolean; count: number; notifications: any[] }>('/notifications');
    },

    getUnreadCount: async () => {
      return await request<{ success: boolean; count: number }>('/notifications/unread-count');
    },

    markAllRead: async () => {
      return await request<{ success: boolean }>('/notifications/read-all', {
        method: 'PATCH'
      });
    }
  },

  // Chat
  chat: {
    getConversations: async () => {
      return await request<{ success: boolean; conversations: any[] }>('/chat/conversations');
    },

    getMessages: async (conversationId: string, params?: { limit?: number; before?: string }) => {
      const q = new URLSearchParams();
      if (params?.limit) q.append('limit', String(params.limit));
      if (params?.before) q.append('before', params.before);
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return await request<{ success: boolean; messages: ChatMessage[]; hasMore?: boolean }>(`/chat/conversations/${conversationId}/messages${queryStr}`);
    },

    sendMessage: async (data: { receiverId?: string; recipientId?: string; text: string; conversationId?: string; clientTempId?: string; attachments?: any[] }) => {
      return await request<{ success: boolean; message: ChatMessage }>('/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          recipientId: data.recipientId || data.receiverId
        })
      });
    },

    markConversationRead: async (conversationId: string) => {
      return await request<{ success: boolean }>(`/chat/conversations/${conversationId}/read`, {
        method: 'PATCH'
      });
    },

    getUnreadCount: async () => {
      return await request<{ success: boolean; count: number }>('/chat/unread-count');
    }
  }
};
