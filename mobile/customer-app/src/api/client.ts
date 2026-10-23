import { CONFIG } from '../config';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import type { User, ServiceCategory, Job, Booking, ReviewItem, ChatMessage, ConversationItem, ServiceAddress } from '../types';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export async function getStoredAuthToken(): Promise<string | null> {
  // Check primary customer token key
  const primary = await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (primary && typeof primary === 'string' && primary.trim().length > 0) {
    return primary.trim();
  }

  // Check fallback compatibility keys
  for (const altKey of ['worklogy_token', 'token', 'worklogy_auth_token']) {
    const alt = await secureStorage.getItem(altKey);
    if (alt && typeof alt === 'string' && alt.trim().length > 0) {
      return alt.trim();
    }
  }

  return null;
}

const normalizeUser = (u: any): User => {
  if (!u) return u;
  return {
    ...u,
    _id: u._id || u.id,
    id: u.id || u._id
  };
};

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
    } else {
      const authErr: any = new Error('Not authorized to access this route (token missing)');
      authErr.isAuthError = true;
      authErr.isTokenMissing = true;
      authErr.status = 401;
      throw authErr;
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      // Purge stale tokens upon 401 unauthorized
      await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await secureStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      await secureStorage.removeItem('worklogy_token');
      await secureStorage.removeItem('token');

      const expiredErr: any = new Error(data.message || 'Session expired. Please sign in again.');
      expiredErr.isAuthError = true;
      expiredErr.isSessionExpired = true;
      expiredErr.status = 401;
      throw expiredErr;
    }

    const err: any = new Error(data.message || data.error || `HTTP error ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data as T;
}

export const api = {
  // Auth
  auth: {
    login: async (credentials: { email: string; password: string }) => {
      const data = await request<{ success: boolean; token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
        requiresAuth: false
      });
      if (data.token) {
        await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
        await secureStorage.setItem('worklogy_token', data.token);
        const normalized = normalizeUser(data.user);
        await secureStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(normalized));
        return { ...data, user: normalized };
      }
      return data;
    },

    register: async (userData: { name: string; email: string; phone?: string; password: string; role?: string }) => {
      const data = await request<{ success: boolean; token: string; user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...userData, role: 'customer' }),
        requiresAuth: false
      });
      if (data.token) {
        await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
        await secureStorage.setItem('worklogy_token', data.token);
        const normalized = normalizeUser(data.user);
        await secureStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(normalized));
        return { ...data, user: normalized };
      }
      return data;
    },

    getCurrentUser: async () => {
      const data = await request<{ success: boolean; user: any }>('/auth/me');
      if (data?.user) {
        const normalized = normalizeUser(data.user);
        await secureStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(normalized));
        return { ...data, user: normalized };
      }
      return data;
    },

    switchRole: async (role: 'customer' | 'vendor') => {
      const data = await request<{ success: boolean; user: any; token?: string }>('/auth/role', {
        method: 'PATCH',
        body: JSON.stringify({ role })
      });
      if (data?.user) {
        data.user = normalizeUser(data.user);
      }
      return data;
    },

    updateDetails: async (data: { name: string; phone?: string; avatar?: string }) => {
      const res = await request<{ success: boolean; user: any }>('/auth/updatedetails', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      if (res?.user) {
        const normalized = normalizeUser(res.user);
        await secureStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(normalized));
        return { ...res, user: normalized };
      }
      return res;
    },

    logout: async () => {
      await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await secureStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      await secureStorage.removeItem('worklogy_token');
      await secureStorage.removeItem('token');
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

    createDirectBooking: async (bookingData: {
      vendorId: string;
      service?: string;
      serviceId?: string;
      serviceTitle: string;
      category?: string;
      serviceType?: string;
      problemDescription?: string;
      urgency?: 'normal' | 'emergency' | 'medium' | 'urgent';
      scheduledDate?: string;
      timeSlot?: string;
      address?: any;
      pricing?: {
        type?: string;
        amount: number;
      };
      notes?: string;
    }) => {
      return await request<{ success: boolean; booking: Booking; message?: string }>('/bookings/direct', {
        method: 'POST',
        body: JSON.stringify(bookingData)
      });
    },

    cancelBooking: async (id: string, reason: string) => {
      return await request<{ success: boolean; message: string; booking: Booking }>(`/bookings/${id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason })
      });
    }
  },

  // Services Discovery
  services: {
    getServices: async (params?: { category?: string; domain?: string; city?: string; search?: string; minPrice?: number; maxPrice?: number; sortBy?: string; page?: number; limit?: number }) => {
      const parts: string[] = [];
      if (params?.category) parts.push(`category=${encodeURIComponent(params.category)}`);
      if (params?.domain) parts.push(`domain=${encodeURIComponent(params.domain)}`);
      if (params?.city) parts.push(`city=${encodeURIComponent(params.city)}`);
      if (params?.search) parts.push(`search=${encodeURIComponent(params.search)}`);
      if (params?.minPrice) parts.push(`minPrice=${params.minPrice}`);
      if (params?.maxPrice) parts.push(`maxPrice=${params.maxPrice}`);
      if (params?.sortBy) parts.push(`sortBy=${encodeURIComponent(params.sortBy)}`);
      if (params?.page) parts.push(`page=${params.page}`);
      if (params?.limit) parts.push(`limit=${params.limit}`);
      const queryString = parts.length > 0 ? `?${parts.join('&')}` : '';
      return await request<{ success: boolean; count: number; total?: number; totalPages?: number; page?: number; services: any[] }>(`/vendors/services${queryString}`, {
        requiresAuth: false
      });
    },

    getById: async (id: string) => {
      return await request<{ success: boolean; service: any }>(`/vendors/services/${id}`, {
        requiresAuth: false
      });
    }
  },

  // Customer Addresses & Profile & Transactions
  customer: {
    getProfile: async () => {
      return await request<{ success: boolean; profile: any }>('/users/customer/profile');
    },

    getAddresses: async () => {
      try {
        const res = await request<{ success: boolean; profile: any }>('/users/customer/profile');
        if (res?.profile?.addresses) {
          return { success: true, addresses: res.profile.addresses as ServiceAddress[] };
        }
      } catch {
        // Fallback
      }
      return { success: true, addresses: [] };
    },

    addAddress: async (address: Partial<ServiceAddress>) => {
      const payload = {
        label: address.label || 'Home',
        houseNumber: address.houseNumber || '',
        locality: address.locality || '',
        street: address.street || '',
        city: address.city || 'Lucknow',
        state: address.state || 'Uttar Pradesh',
        zipCode: address.zipCode || address.pincode || '226010',
        isDefault: !!address.isDefault,
        coordinates: address.coordinates || { lat: 26.8467, lng: 80.9462 }
      };
      return await request<{ success: boolean; addresses: ServiceAddress[] }>('/users/customer/addresses', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    deleteAddress: async (addressId: string) => {
      return await request<{ success: boolean; addresses: ServiceAddress[] }>(`/users/customer/addresses/${addressId}`, {
        method: 'DELETE'
      });
    },

    getTransactions: async () => {
      return await request<{ success: boolean; count: number; transactions: any[] }>('/customer/transactions');
    }
  },

  // Reviews
  reviews: {
    submit: async (data: { booking: string; rating: number; title?: string; comment: string }) => {
      return await request<{ success: boolean; review: ReviewItem }>('/reviews', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    getRecentReviews: async (limit: number = 6) => {
      return await request<{ success: boolean; count: number; reviews: any[] }>(`/reviews/recent?limit=${limit}`, {
        requiresAuth: false
      });
    }
  },

  // Vendors / Verified Pros
  vendors: {
    getVendors: async (params?: { category?: string; city?: string; search?: string; sortBy?: string; verifiedOnly?: boolean; page?: number; limit?: number }) => {
      const parts: string[] = [];
      if (params?.category) parts.push(`category=${encodeURIComponent(params.category)}`);
      if (params?.city) parts.push(`city=${encodeURIComponent(params.city)}`);
      if (params?.search) parts.push(`search=${encodeURIComponent(params.search)}`);
      if (params?.sortBy) parts.push(`sortBy=${encodeURIComponent(params.sortBy)}`);
      if (params?.verifiedOnly) parts.push(`verifiedOnly=true`);
      if (params?.page) parts.push(`page=${params.page}`);
      if (params?.limit) parts.push(`limit=${params.limit}`);
      const queryString = parts.length > 0 ? `?${parts.join('&')}` : '';
      return await request<{ success: boolean; count: number; total?: number; totalPages?: number; page?: number; vendors: any[] }>(`/vendors${queryString}`, {
        requiresAuth: false
      });
    },

    getVendorById: async (id: string) => {
      return await request<{
        success: boolean;
        vendor: any;
        serviceListings?: any[];
        reviews?: any[];
        ratingBreakdown?: {
          averageRating: number;
          totalReviews: number;
          breakdown: Record<string, number>;
          percentages: Record<string, number>;
        };
        similarVendors?: any[];
      }>(`/vendors/${id}`, {
        requiresAuth: false
      });
    }
  },

  // Notifications
  notifications: {
    getUnreadCount: async () => {
      return await request<{ success: boolean; count: number }>('/notifications/unread-count');
    },

    getAll: async () => {
      return await request<{ success: boolean; count: number; notifications: any[] }>('/notifications');
    },

    markAllAsRead: async () => {
      return await request<{ success: boolean }>('/notifications/read-all', {
        method: 'PATCH'
      });
    },

    getPreferences: async () => {
      return await request<{ success: boolean; preferences: any }>('/notifications/preferences');
    },

    updatePreferences: async (preferences: any) => {
      return await request<{ success: boolean; message: string; preferences: any }>('/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(preferences)
      });
    }
  },

  // Support & Dispute Tickets
  support: {
    getMyTickets: async () => {
      return await request<{ success: boolean; count: number; tickets: any[] }>('/support/my');
    },

    createTicket: async (data: { category: string; subject: string; description: string; priority?: string }) => {
      return await request<{ success: boolean; message: string; ticket: any }>('/support', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  },

  // Location / Geocoding
  location: {
    reverseGeocode: async (lat: number, lng: number) => {
      return await request<{ success: boolean; address: any }>(`/location/reverse-geocode?lat=${lat}&lng=${lng}`);
    }
  },

  // Chat
  chat: {
    getConversations: async () => {
      return await request<{ success: boolean; conversations: ConversationItem[] }>('/chat/conversations');
    },

    getMessages: async (conversationId: string, params?: { limit?: number; before?: string }) => {
      const q: string[] = [];
      if (params?.limit) q.push(`limit=${params.limit}`);
      if (params?.before) q.push(`before=${encodeURIComponent(params.before)}`);
      const queryStr = q.length > 0 ? `?${q.join('&')}` : '';
      return await request<{
        success: boolean;
        messages: ChatMessage[];
        hasMore?: boolean;
        oldestCursor?: string;
      }>(`/chat/conversations/${conversationId}/messages${queryStr}`);
    },

    sendMessage: async (data: {
      conversationId?: string;
      recipientId?: string;
      receiverId?: string;
      text: string;
      messageType?: string;
      clientTempId?: string;
      attachments?: any[];
    }) => {
      const payload: any = {
        ...data,
        recipientId: data.recipientId || data.receiverId
      };
      return await request<{ success: boolean; message: ChatMessage; clientTempId?: string; isDuplicate?: boolean }>('/chat/messages', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    startConversation: async (data: { recipientId: string; jobId?: string; bookingId?: string; relatedJob?: string; relatedBooking?: string }) => {
      const payload = {
        recipientId: data.recipientId,
        relatedJob: data.relatedJob || data.jobId,
        relatedBooking: data.relatedBooking || data.bookingId
      };
      return await request<{ success: boolean; conversation: ConversationItem }>('/chat/conversations', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    markConversationRead: async (conversationId: string) => {
      return await request<{ success: boolean }>(`/chat/conversations/${conversationId}/read`, {
        method: 'PATCH'
      });
    },

    getUnreadCount: async () => {
      return await request<{ success: boolean; unreadCount: number }>('/chat/unread-count');
    }
  }
};

