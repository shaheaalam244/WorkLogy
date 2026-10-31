import { Platform } from 'react-native';
import { CONFIG, SERVERS } from '../config';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import type { User, Job, Booking, VendorProfile, ChatMessage, ServiceCategory } from '../types';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  timeoutMs?: number;
  _isRetry?: boolean;
}

// ── Dynamic Host Management & Multi-Server Support ──
export type ServerTarget = 'local' | 'vps' | 'auto';

const FALLBACK_API_BASE = `http://${SERVERS.VPS_HOST}/api`;
const FALLBACK_SOCKET_URL = `http://${SERVERS.VPS_HOST}`;

let currentServerTarget: ServerTarget = 'auto';
let activeBaseUrl = CONFIG.API_BASE_URL;
let activeSocketUrl = CONFIG.SOCKET_URL;

export function getActiveBaseUrl(): string {
  return activeBaseUrl;
}

export function getActiveSocketUrl(): string {
  return activeSocketUrl;
}

export function getCurrentServerTarget(): ServerTarget {
  return currentServerTarget;
}

export function resetActiveHost(): void {
  activeBaseUrl = CONFIG.API_BASE_URL;
  activeSocketUrl = CONFIG.SOCKET_URL;
}

export function applyServerTarget(target: ServerTarget, customHost?: string): void {
  currentServerTarget = target;
  const localHost = customHost || SERVERS.LOCAL_LAN_HOST;

  if (target === 'local') {
    activeBaseUrl = `http://${localHost}/api`;
    activeSocketUrl = `http://${localHost}`;
  } else if (target === 'vps') {
    activeBaseUrl = `http://${SERVERS.VPS_HOST}/api`;
    activeSocketUrl = `http://${SERVERS.VPS_HOST}`;
  } else {
    activeBaseUrl = CONFIG.API_BASE_URL;
    activeSocketUrl = CONFIG.SOCKET_URL;
  }
}

export async function switchServerTarget(target: ServerTarget, customHost?: string): Promise<void> {
  await secureStorage.setItem(STORAGE_KEYS.SERVER_TARGET, target);
  if (customHost) {
    await secureStorage.setItem(STORAGE_KEYS.CUSTOM_LOCAL_HOST, customHost);
  }
  applyServerTarget(target, customHost);
}

export async function initializeServerTarget(): Promise<ServerTarget> {
  try {
    const saved = await secureStorage.getItem(STORAGE_KEYS.SERVER_TARGET);
    if (saved === 'local' || saved === 'vps' || saved === 'auto') {
      currentServerTarget = saved as ServerTarget;
    }
    const customHost = await secureStorage.getItem(STORAGE_KEYS.CUSTOM_LOCAL_HOST);
    applyServerTarget(currentServerTarget, customHost || undefined);
  } catch (err) {
    console.warn('[Vendor API] Server target init notice:', err);
  }
  return currentServerTarget;
}

initializeServerTarget().catch(() => {});

export async function pingServerHealth(baseUrl: string, timeoutMs = 3500): Promise<{ ok: boolean; latency: number; service?: string; error?: string }> {
  const start = Date.now();
  try {
    const cleanBase = baseUrl.replace(/\/api\/?$/, '');
    const res = await doFetchWithTimeout(`${cleanBase}/api/health`, { method: 'GET' }, timeoutMs);
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: true, latency, service: data.service || 'Worklogy API' };
    }
    return { ok: false, latency, error: `HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, latency: Date.now() - start, error: err.message || 'Unreachable' };
  }
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

export async function getStoredRefreshToken(): Promise<string | null> {
  const token = await secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  if (token && typeof token === 'string' && token.trim().length > 0) {
    return token.trim();
  }
  return null;
}

// ── Single-Flight Silent Token Refresh ──
let refreshPromise: Promise<string | null> | null = null;

export async function refreshSessionToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = await getStoredRefreshToken();
      if (!refreshToken) {
        return null;
      }

      const currentBase = activeBaseUrl;
      const res = await doFetchWithTimeout(
        `${currentBase}/auth/token/refresh`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        },
        10000
      );

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.token) {
        await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
        if (data.refreshToken) {
          await secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
        }
        if (data.user) {
          await secureStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(data.user));
        }
        return data.token;
      }

      // If session is revoked or invalid, clear local credentials
      if (data.code === 'SESSION_REVOKED' || data.code === 'INVALID_REFRESH_TOKEN') {
        await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        await secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        await secureStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      }
      return null;
    } catch (err) {
      console.warn('[API Client] Silent refresh warning:', err);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function doFetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal
    });
    return res;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      const toErr: any = new Error(`Request timed out after ${timeoutMs}ms`);
      toErr.isTimeout = true;
      toErr.status = 408;
      throw toErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { requiresAuth = true, timeoutMs: customTimeout, _isRetry = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>)
  };

  if (requiresAuth) {
    let token = await getStoredAuthToken();
    if (!token && !_isRetry) {
      token = await refreshSessionToken();
    }
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

  let response: Response;
  const currentBase = activeBaseUrl;
  const isLocalHost =
    currentBase.includes('10.') ||
    currentBase.includes('localhost') ||
    currentBase.includes('127.0.0.1') ||
    currentBase.includes('192.168.') ||
    currentBase.includes('172.');

  const timeout = customTimeout || (isLocalHost ? 10000 : 15000);
  const primaryUrl = `${currentBase}${endpoint}`;

  try {
    response = await doFetchWithTimeout(primaryUrl, { ...fetchOptions, headers }, timeout);
  } catch (networkErr: any) {
    if (currentServerTarget === 'local') {
      const localErr: any = new Error(
        `Local backend is unreachable at ${currentBase}. Please run 'npm run dev' in backend or switch to VPS in Settings.`
      );
      localErr.isNetworkError = true;
      localErr.serverTarget = 'local';
      throw localErr;
    }

    if (!primaryUrl.startsWith(FALLBACK_API_BASE)) {
      try {
        const fallbackUrl = `${FALLBACK_API_BASE}${endpoint}`;
        response = await doFetchWithTimeout(fallbackUrl, { ...fetchOptions, headers }, 12000);
        activeBaseUrl = FALLBACK_API_BASE;
        activeSocketUrl = FALLBACK_SOCKET_URL;
      } catch {
        throw networkErr;
      }
    } else {
      throw networkErr;
    }
  }

  const data = await response.json().catch(() => ({}));

  // Handle 401 Unauthorized / Token Expired with automatic silent refresh
  if (response.status === 401 && !_isRetry) {
    const isAuthRoute =
      endpoint.startsWith('/auth/login') ||
      endpoint.startsWith('/auth/otp') ||
      endpoint.startsWith('/auth/token/refresh');

    if (!isAuthRoute) {
      const isTokenExpired =
        data.code === 'TOKEN_EXPIRED' ||
        (typeof data.message === 'string' && data.message.toLowerCase().includes('expired'));

      if (isTokenExpired) {
        const refreshedToken = await refreshSessionToken();
        if (refreshedToken) {
          // Retry the request with the new access token
          return await request<T>(endpoint, {
            ...options,
            _isRetry: true
          });
        }
      }
    }
  }

  if (!response.ok) {
    const err: any = new Error(data.message || data.error || `HTTP error ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data as T;
}


export const api = {
  // Auth
  auth: {
    checkPhone: async (phone: string, role: string = 'vendor') => {
      return await request<{
        success: boolean;
        exists: boolean;
        isRegistered: boolean;
        status: 'active' | 'new' | 'suspended' | 'blocked';
        phone: string;
        name?: string;
        message?: string;
        suspensionReason?: string;
      }>('/auth/vendor/check-phone', {
        method: 'POST',
        body: JSON.stringify({ phone, role }),
        requiresAuth: false
      });
    },

    // Mobile OTP (Login & Registration)
    sendOtp: async (phone: string, purpose: 'login' | 'register' = 'login') => {
      return await request<{
        success: boolean;
        message: string;
        phone: string;
        purpose?: string;
        cooldownSeconds: number;
        expiresInSeconds: number;
        debugCode?: string;
      }>('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phone, purpose }),
        requiresAuth: false
      });
    },

    getOtpStatus: async (phone: string, reqId?: string) => {
      const q = new URLSearchParams({ phone });
      if (reqId) q.append('reqId', reqId);
      return await request<{
        success: boolean;
        deliveryStatus: 'REQUEST_ACCEPTED' | 'DELIVERY_PENDING' | 'DELIVERED' | 'DELIVERY_FAILED' | 'REJECTED' | 'PROVIDER_ERROR';
        provider: string;
        reqId?: string;
        details?: any;
      }>(`/auth/otp/status?${q.toString()}`, {
        method: 'GET',
        requiresAuth: false
      });
    },

    verifyOtp: async (params: {
      phone: string;
      otp: string;
      deviceInfo?: any;
    }) => {
      const data = await request<{
        success: boolean;
        token: string;
        refreshToken?: string;
        session?: { id: string; expiresAt: string };
        user: User;
        profile?: any;
        isNewUser?: boolean;
        onboardingStep?: string;
      }>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify(params),
        requiresAuth: false
      });

      if (data.token) {
        await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
        if (data.refreshToken) {
          await secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
        }
        await secureStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(data.user));
      }
      return data;
    },

    refreshToken: async () => {
      return await refreshSessionToken();
    },

    login: async (credentials: { email: string; password: string }) => {
      const data = await request<{
        success: boolean;
        token: string;
        refreshToken?: string;
        user: User;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
        requiresAuth: false
      });
      if (data.token) {
        await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
        if (data.refreshToken) {
          await secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
        }
        await secureStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(data.user));
      }
      return data;
    },

    register: async (userData: {
      name: string;
      email: string;
      phone?: string;
      password: string;
      role?: string;
      businessName?: string;
      category?: string;
      selectedCategory?: string;
      categories?: string[];
      serviceDomainIds?: string[];
      selectedCategories?: string[];
    }) => {
      const data = await request<{ success: boolean; token: string; refreshToken?: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...userData, role: 'vendor' }),
        requiresAuth: false
      });
      if (data.token) {
        await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
        if (data.refreshToken) {
          await secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
        }
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

    updateProfile: async (data: { name?: string; phone?: string; avatar?: string }) => {
      return await request<{ success: boolean; user: User }>('/auth/updatedetails', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    logout: async () => {
      try {
        const refreshToken = await getStoredRefreshToken();
        await request('/auth/session/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
          requiresAuth: true
        }).catch(() => {});
      } catch {
        // Continue clearing local storage even if offline
      } finally {
        await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        await secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        await secureStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      }
    },

    updatePassword: async (currentPassword: string, newPassword: string) => {
      return await request<{ success: boolean; message: string }>('/auth/updatepassword', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
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

    getByJobId: async (jobId: string) => {
      return await request<{ success: boolean; booking?: Booking; jobOnly?: boolean; job?: Job }>(`/bookings/by-job/${jobId}`);
    },

    updateStatus: async (id: string, status: string, notes?: string) => {
      return await request<{ success: boolean; message: string; booking: Booking }>(`/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note: notes, notes })
      });
    },

    verifyArrivalOtp: async (id: string, otp: string, coords?: { latitude?: number; longitude?: number; accuracy?: number }) => {
      return await request<{ success: boolean; message: string; booking: Booking }>(`/bookings/${id}/verify-arrival-otp`, {
        method: 'POST',
        body: JSON.stringify({ otp, ...coords })
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

    create: async (data: any, idempotencyKey?: string) => {
      const headers: Record<string, string> = {};
      const key = idempotencyKey || data?.idempotencyKey;
      if (key) {
        headers['x-idempotency-key'] = key;
      }
      return await request<{ success: boolean; message: string; service: any; isDuplicate?: boolean }>('/vendors/services', {
        method: 'POST',
        headers,
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
    getDashboardStats: async () => {
      return await request<{ success: boolean; stats: any }>('/vendors/dashboard-stats');
    },

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

    getAvailability: async () => {
      return await request<{ success: boolean; availability: any }>('/vendors/availability');
    },

    updateAvailability: async (data: {
      isAvailableNow?: boolean;
      days?: string[];
      hours?: { start?: string; end?: string };
      emergencyAvailable?: boolean;
      maxDailyJobs?: number;
    }) => {
      return await request<{ success: boolean; availability: any; emergencyAvailability?: any }>('/vendors/availability', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    getVerificationStatus: async () => {
      return await request<{ success: boolean; verification: any }>('/vendors/verification/status');
    },

    getEarnings: async () => {
      return await request<{ success: boolean; earnings: any }>('/vendors/earnings');
    },

    getTransactions: async (params?: { status?: string }) => {
      const query = params?.status ? `?status=${params.status}` : '';
      return await request<{ success: boolean; count: number; transactions: any[] }>(`/vendors/transactions${query}`);
    },

    requestVerification: async (data: {
      idType?: string;
      verificationType?: string;
      idNumber?: string;
      documentUrl?: string;
      documents?: Array<{ name: string; url: string; type?: string }>;
      consent?: boolean;
      statutoryConsent?: boolean;
    }) => {
      const payload = {
        verificationType: data.verificationType || data.idType || 'Aadhaar Card',
        idNumber: data.idNumber || '',
        consent: data.consent ?? data.statutoryConsent ?? true,
        documents: data.documents || [
          {
            name: `${data.verificationType || data.idType || 'Govt_ID'}_Document.pdf`,
            url: data.documentUrl?.endsWith('.pdf') ? data.documentUrl : `${data.documentUrl || 'https://worklogy.in/docs/vendor_id'}.pdf`
          }
        ]
      };
      return await request<{ success: boolean; message: string }>('/vendors/verification', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    getServiceArea: async () => {
      return await request<{
        success: boolean;
        serviceArea: {
          baseAddress: string;
          pincode: string;
          coordinates: { lat: number; lng: number };
          radiusKm: number;
          selectedLocalityIds: string[];
          excludedLocalityIds: string[];
          selectedZoneIds: string[];
          updatedAt: string;
          version: number;
        };
        coverage: {
          totalLocalities: number;
          totalWithinRadius: number;
          selectedCount: number;
          excludedCount: number;
          zonesCoveredCount: number;
          zones: Array<{
            zoneId: string;
            zoneName: string;
            centerArea: string;
            city: string;
            coordinates: { lat: number; lng: number };
            totalCount: number;
            withinRadiusCount: number;
            selectedCount: number;
            localities: Array<{
              localityId: string;
              name: string;
              pinCode?: string;
              coordinates: { lat: number; lng: number };
              distanceKm: number;
              isWithinRadius: boolean;
              isSelected: boolean;
              isExcluded: boolean;
            }>;
          }>;
        };
      }>('/vendors/service-area');
    },

    updateServiceArea: async (data: {
      coordinates: { lat: number; lng: number };
      radiusKm: number;
      baseAddress?: string;
      pincode?: string;
      selectedLocalityIds?: string[];
      excludedLocalityIds?: string[];
      selectedZoneIds?: string[];
    }) => {
      return await request<{
        success: boolean;
        message: string;
        serviceArea: any;
        coverageSummary: any;
      }>('/vendors/service-area', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    }
  },

  // Zones & Geographic Coverage
  zones: {
    getAll: async () => {
      return await request<{ success: boolean; count: number; zones: any[] }>('/zones');
    },
    getCoverage: async (lat: number, lng: number, radiusKm: number) => {
      return await request<{
        success: boolean;
        center: { lat: number; lng: number };
        radiusKm: number;
        totalLocalities: number;
        totalWithinRadius: number;
        zonesCoveredCount: number;
        zones: any[];
      }>(`/zones/coverage?lat=${lat}&lng=${lng}&radius=${radiusKm}`);
    },
    reverseGeocode: async (lat: number, lng: number) => {
      return await request<{
        success: boolean;
        address: string;
        locality: string;
        city: string;
        pinCode: string;
        zoneId: string;
        zoneName: string;
        distanceKm: number;
      }>(`/zones/reverse-geocode?lat=${lat}&lng=${lng}`);
    },
    resolve: async (queryOrCoords: string | { lat: number; lng: number }) => {
      const q = typeof queryOrCoords === 'string'
        ? `locality=${encodeURIComponent(queryOrCoords)}`
        : `lat=${queryOrCoords.lat}&lng=${queryOrCoords.lng}`;
      return await request<{
        success: boolean;
        resolved: any;
      }>(`/zones/resolve?${q}`);
    }
  },

  // Notifications
  notifications: {
    getAll: async () => {
      return await request<{ success: boolean; count?: number; unreadCount?: number; notifications: any[] }>('/notifications');
    },

    getUnreadCount: async () => {
      const token = await getStoredAuthToken();
      if (!token) return { success: true, count: 0, unreadCount: 0 };
      return await request<{ success: boolean; count?: number; unreadCount?: number }>('/notifications/unread-count');
    },

    markAsRead: async (id: string) => {
      return await request<{ success: boolean; unreadCount?: number }>(`/notifications/${id}/read`, {
        method: 'PATCH'
      });
    },

    markAllRead: async () => {
      return await request<{ success: boolean; unreadCount?: number }>('/notifications/read-all', {
        method: 'PATCH'
      });
    },

    getPreferences: async () => {
      return await request<{ success: boolean; preferences: any }>('/notifications/preferences');
    },

    updatePreferences: async (preferences: {
      emailQuotations?: boolean;
      emailBookings?: boolean;
      emailStatusUpdates?: boolean;
      emailCancellations?: boolean;
      emailMarketing?: boolean;
      pushMessages?: boolean;
      pushJobLeads?: boolean;
      pushBookings?: boolean;
      pushStatusUpdates?: boolean;
      pushCancellations?: boolean;
    }) => {
      return await request<{ success: boolean; preferences: any }>('/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(preferences)
      });
    },

    registerPushToken: async (data: {
      token: string;
      platform?: string;
      deviceId?: string;
      deviceModel?: string;
      appVersion?: string;
    }) => {
      return await request<{ success: boolean; message?: string }>('/notifications/push-token', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    deregisterPushToken: async (token: string) => {
      return await request<{ success: boolean; message?: string }>('/notifications/push-token', {
        method: 'DELETE',
        body: JSON.stringify({ token })
      });
    },

    sendTestPush: async (payload?: { title?: string; body?: string }) => {
      return await request<{ success: boolean; message?: string; sentCount?: number; totalAttempted?: number }>(
        '/notifications/test-push',
        {
          method: 'POST',
          body: JSON.stringify(payload || {})
        }
      );
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
      return await request<{ success: boolean; modifiedCount?: number }>(`/chat/conversations/${conversationId}/read`, {
        method: 'PATCH'
      });
    },

    getUnreadCount: async () => {
      const token = await getStoredAuthToken();
      if (!token) return { success: true, count: 0, unreadCount: 0 };
      return await request<{ success: boolean; count?: number; unreadCount?: number }>('/chat/unread-count');
    }
  },

  // Reviews & Customer Feedback
  reviews: {
    getMyReviews: async () => {
      return await request<{ success: boolean; count: number; reviews: any[] }>('/reviews/me');
    },

    respondToReview: async (reviewId: string, text: string) => {
      return await request<{ success: boolean; message: string; review: any }>(`/reviews/${reviewId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });
    }
  },

  // Media & Image Uploads (Reliable React Native Multipart Upload)
  media: {
    uploadImage: async (fileUri: string, mimeType?: string, customFilename?: string): Promise<{ success: boolean; url: string; publicId: string }> => {
      if (!fileUri) {
        throw new Error('Please select a document or image to upload.');
      }

      let resolvedMime = mimeType;
      const lowerUri = fileUri.toLowerCase();
      let extension = 'jpg';
      if (lowerUri.includes('.png') || resolvedMime === 'image/png') {
        extension = 'png';
        resolvedMime = 'image/png';
      } else if (lowerUri.includes('.webp') || resolvedMime === 'image/webp') {
        extension = 'webp';
        resolvedMime = 'image/webp';
      } else if (lowerUri.includes('.pdf') || resolvedMime === 'application/pdf') {
        extension = 'pdf';
        resolvedMime = 'application/pdf';
      } else {
        extension = 'jpg';
        resolvedMime = 'image/jpeg';
      }

      let filename = customFilename || fileUri.split('/').pop() || `doc_${Date.now()}.${extension}`;
      if (!filename.includes('.')) {
        filename = `${filename}.${extension}`;
      }

      // Ensure proper URI formatting for Android content:// and file://
      const formattedUri = Platform.OS === 'android' && !fileUri.startsWith('file://') && !fileUri.startsWith('content://')
        ? `file://${fileUri}`
        : fileUri;

      const token = await getStoredAuthToken();
      const baseUrl = getActiveBaseUrl();
      const uploadEndpoints = [
        `${baseUrl}/vendors/upload-image`,
        `${baseUrl}/jobs/upload-image`
      ];

      // Primary upload: XMLHttpRequest with React Native native multipart FormData.
      // Bypasses WinterCG fetch to eliminate "Unsupported FormDataPart implementation"
      const uploadWithXHR = (url: string): Promise<{ success: boolean; url: string; publicId: string }> => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', url);
          xhr.setRequestHeader('Accept', 'application/json');
          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
          xhr.timeout = 45000;

          xhr.onload = () => {
            try {
              const data = JSON.parse(xhr.responseText || '{}');
              if (xhr.status >= 200 && xhr.status < 300 && (data.secure_url || data.url)) {
                resolve({
                  success: true,
                  url: data.secure_url || data.url,
                  publicId: data.public_id || data.publicId || `upload_${Date.now()}`
                });
              } else {
                reject(new Error(data.message || data.error || `Upload failed with status ${xhr.status}`));
              }
            } catch {
              reject(new Error(`Server error (${xhr.status}): Could not process upload response`));
            }
          };

          xhr.onerror = () => {
            reject(new Error('Network error during file upload. Please verify your connection.'));
          };

          xhr.ontimeout = () => {
            reject(new Error('Upload timed out. Please try again.'));
          };

          const formData = new FormData();
          formData.append('image', {
            uri: formattedUri,
            name: filename,
            type: resolvedMime
          } as any);

          xhr.send(formData);
        });
      };

      let lastError: Error | null = null;
      for (const endpoint of uploadEndpoints) {
        try {
          return await uploadWithXHR(endpoint);
        } catch (err: any) {
          lastError = err;
          if (err.message && (err.message.includes('404') || err.message.includes('not found'))) {
            continue;
          }
          break;
        }
      }

      throw lastError || new Error('Upload failed. Please check your network connection.');
    }
  },

  // Support & Help Desk
  support: {
    getMyTickets: async () => {
      return await request<{ success: boolean; count: number; tickets: any[] }>('/support/my');
    },

    createTicket: async (data: { category?: string; subject: string; description: string; priority?: string }) => {
      return await request<{ success: boolean; message: string; ticket: any }>('/support', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    addTicketResponse: async (ticketId: string, message: string) => {
      return await request<{ success: boolean; message: string; ticket: any }>(`/support/${ticketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message })
      });
    }
  },

  servers: {
    getTarget: getCurrentServerTarget,
    switchTarget: switchServerTarget,
    ping: pingServerHealth,
    getActiveBaseUrl,
    getActiveSocketUrl
  },

  // Vendor convenience alias
  vendor: {
    getProfile: async () => {
      return await request<{ success: boolean; vendor: VendorProfile }>('/vendors/profile/me');
    },
    updateProfile: async (data: Partial<VendorProfile> | any) => {
      return await request<{ success: boolean; vendor: VendorProfile }>('/vendors/profile/me', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    createService: async (data: any, idempotencyKey?: string) => {
      const headers: Record<string, string> = {};
      const key = idempotencyKey || data?.idempotencyKey;
      if (key) {
        headers['x-idempotency-key'] = key;
      }
      return await request<{ success: boolean; message: string; service: any; isDuplicate?: boolean }>('/vendors/services', {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
    }
  }
};

