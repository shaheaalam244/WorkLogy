import { CONFIG, SERVERS } from '../config';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import type { User, ServiceCategory, Job, Booking, ReviewItem, ChatMessage, ConversationItem, ServiceAddress } from '../types';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  timeoutMs?: number;
  bypassCache?: boolean;
}

// ── In-Memory Auth Token Cache (0ms Access, No Async Disk Latency on Every Request) ──
let cachedAuthToken: string | null = null;

export async function getStoredAuthToken(): Promise<string | null> {
  if (cachedAuthToken && typeof cachedAuthToken === 'string' && cachedAuthToken.length > 0) {
    return cachedAuthToken;
  }

  // Check primary customer token key
  const primary = await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (primary && typeof primary === 'string' && primary.trim().length > 0) {
    cachedAuthToken = primary.trim();
    return cachedAuthToken;
  }

  // Check fallback compatibility keys
  for (const altKey of ['worklogy_token', 'token', 'worklogy_auth_token']) {
    const alt = await secureStorage.getItem(altKey);
    if (alt && typeof alt === 'string' && alt.trim().length > 0) {
      cachedAuthToken = alt.trim();
      return cachedAuthToken;
    }
  }

  return null;
}

export function setCachedAuthToken(token: string | null): void {
  cachedAuthToken = token && typeof token === 'string' && token.trim().length > 0 ? token.trim() : null;
}

// ── In-Memory TTL Cache for Static & Semi-Static Endpoints ──
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}
const memoryCache = new Map<string, CacheEntry<any>>();

export function getMemoryCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

export function setMemoryCached<T>(key: string, data: T, ttlMs: number): void {
  memoryCache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
}

export function clearMemoryCache(prefix?: string): void {
  if (!prefix) {
    memoryCache.clear();
  } else {
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }
  }
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
    // 'auto' mode: default to configured local or env, with VPS auto-fallback
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
  clearMemoryCache();
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
    console.warn('[API] Server target init notice:', err);
  }
  return currentServerTarget;
}

// Kick off initialization asynchronously
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

// ── In-Flight Request Deduplication Map for GET requests ──
const inFlightGetRequests = new Map<string, Promise<any>>();

const normalizeUser = (u: any): User => {
  if (!u) return u;
  return {
    ...u,
    _id: u._id || u.id,
    id: u.id || u._id
  };
};

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

async function executeRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { requiresAuth = true, timeoutMs: customTimeout, bypassCache, ...fetchOptions } = options;

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

  let response: Response;
  const currentBase = activeBaseUrl;
  const isLocalHost =
    currentBase.includes('10.211.') ||
    currentBase.includes('localhost') ||
    currentBase.includes('127.0.0.1') ||
    currentBase.includes('192.168.');

  // If hitting local host, use a fast 3500ms timeout so failover is instantaneous; otherwise 12000ms
  const timeout = customTimeout || (isLocalHost ? 3500 : 12000);
  const primaryUrl = `${currentBase}${endpoint}`;

  try {
    response = await doFetchWithTimeout(primaryUrl, { ...fetchOptions, headers }, timeout);
  } catch (networkErr: any) {
    // If the user explicitly locked the app to 'local' mode, do not fail over silently to VPS
    if (currentServerTarget === 'local') {
      const explicitLocalErr: any = new Error(
        `Local backend is unreachable at ${currentBase}. Please run 'npm run dev' in backend or switch to VPS in Profile.`
      );
      explicitLocalErr.isNetworkError = true;
      explicitLocalErr.serverTarget = 'local';
      throw explicitLocalErr;
    }

    // In 'auto' mode: if primary failed and wasn't already VPS, fail over stickily to the live VPS backend
    if (!primaryUrl.startsWith(FALLBACK_API_BASE)) {
      try {
        const fallbackUrl = `${FALLBACK_API_BASE}${endpoint}`;
        response = await doFetchWithTimeout(fallbackUrl, { ...fetchOptions, headers }, 12000);
        // Sticky failover: remember VPS for subsequent calls and socket in this session
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

  if (!response.ok) {
    if (response.status === 401) {
      // Purge stale tokens upon 401 unauthorized
      setCachedAuthToken(null);
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

    let errorMsg = data.message || data.error;
    if (!errorMsg && Array.isArray(data.errors) && data.errors.length > 0) {
      errorMsg = data.errors.map((e: any) => e.message || e.msg).filter(Boolean).join('. ');
    }
    const err: any = new Error(errorMsg || `HTTP error ${response.status}`);
    err.status = response.status;
    err.errors = data.errors;
    throw err;
  }

  return data as T;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const isGet = !options.method || options.method.toUpperCase() === 'GET';
  const reqKey = `${isGet ? 'GET' : options.method}:${endpoint}`;

  if (isGet) {
    const existing = inFlightGetRequests.get(reqKey);
    if (existing) {
      return existing as Promise<T>;
    }
  }

  const exec = async (attempt: number = 0): Promise<T> => {
    try {
      return await executeRequest<T>(endpoint, options);
    } catch (err: any) {
      // Safe selective retry on transient network errors for idempotent GET requests
      if (
        isGet &&
        attempt < 1 &&
        (err?.isTimeout || err?.name === 'TypeError' || err?.message?.includes('Network request failed'))
      ) {
        await new Promise((r) => setTimeout(r, 400));
        return exec(attempt + 1);
      }
      throw err;
    }
  };

  const promise = exec();

  if (isGet) {
    inFlightGetRequests.set(reqKey, promise);
    promise
      .catch(() => {})
      .finally(() => {
        inFlightGetRequests.delete(reqKey);
      });
  }

  return promise;
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
        setCachedAuthToken(data.token);
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
        setCachedAuthToken(data.token);
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

    updateDetails: async (data: { name?: string; phone?: string; avatar?: string }) => {
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

    updateProfile: async (data: { name?: string; email?: string; phone?: string; avatar?: string }) => {
      const res = await request<{ success: boolean; user: any }>('/users/profile', {
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

    updatePassword: async (data: { currentPassword: string; newPassword: string }) => {
      return await request<{ success: boolean; message: string }>('/auth/updatepassword', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    logout: async () => {
      setCachedAuthToken(null);
      clearMemoryCache();
      await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await secureStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      await secureStorage.removeItem('worklogy_token');
      await secureStorage.removeItem('token');
    }
  },

  // Media & Image Uploads (Cloudinary via Backend API)
  media: {
    uploadImage: async (fileUri: string, mimeType?: string) => {
      const token = await getStoredAuthToken();
      // Ensure clean extension and MIME type
      let resolvedMime = mimeType;
      const lowerUri = fileUri.toLowerCase();
      let extension = 'jpg';
      if (lowerUri.includes('.png')) {
        extension = 'png';
        resolvedMime = resolvedMime || 'image/png';
      } else if (lowerUri.includes('.webp')) {
        extension = 'webp';
        resolvedMime = resolvedMime || 'image/webp';
      } else {
        extension = 'jpg';
        resolvedMime = resolvedMime || 'image/jpeg';
      }

      let filename = fileUri.split('/').pop() || `avatar_${Date.now()}.${extension}`;
      if (!filename.includes('.')) {
        filename = `${filename}.${extension}`;
      }

      return new Promise<{ success: boolean; url: string; publicId: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${getActiveBaseUrl()}/jobs/upload-image`);
        xhr.setRequestHeader('Accept', 'application/json');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && json?.url) {
              resolve(json);
            } else {
              reject(new Error(json?.message || `Upload failed with status ${xhr.status}`));
            }
          } catch {
            reject(new Error(`Server error (${xhr.status}): Could not process image`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error during image upload. Please verify your connection.'));
        };

        xhr.ontimeout = () => {
          reject(new Error('Upload timed out. Please try again.'));
        };

        xhr.timeout = 60000;

        const formData = new FormData();
        formData.append('image', {
          uri: fileUri,
          name: filename,
          type: resolvedMime
        } as any);

        xhr.send(formData);
      });
    }
  },

  // In-Memory Cache Management
  cache: {
    clear: clearMemoryCache
  },

  // Categories (with 3-minute in-memory caching)
  categories: {
    getAll: async (bypassCache: boolean = false) => {
      const cacheKey = 'categories_all';
      if (!bypassCache) {
        const cached = getMemoryCached<{ success: boolean; categories: ServiceCategory[] }>(cacheKey);
        if (cached) return cached;
      }
      const data = await request<{ success: boolean; categories: ServiceCategory[] }>('/categories', {
        requiresAuth: false
      });
      if (data?.categories?.length) {
        setMemoryCached(cacheKey, data, 180000); // 3 min TTL
      }
      return data;
    },

    getBySlug: async (slug: string) => {
      const cacheKey = `categories_${slug}`;
      const cached = getMemoryCached<{ success: boolean; category: ServiceCategory }>(cacheKey);
      if (cached) return cached;

      const data = await request<{ success: boolean; category: ServiceCategory }>(`/categories/${slug}`, {
        requiresAuth: false
      });
      if (data?.category) {
        setMemoryCached(cacheKey, data, 180000);
      }
      return data;
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

    getJobById: async (id: string) => {
      return await request<{ success: boolean; job: Job }>(`/jobs/${id}`);
    },

    cancelJob: async (id: string, reason?: string) => {
      try {
        return await request<{ success: boolean; message: string }>(`/jobs/${id}/cancel`, {
          method: 'POST',
          body: JSON.stringify({ reason })
        });
      } catch (err: any) {
        if (err?.message?.includes('Route not found') || err?.status === 404) {
          return await request<{ success: boolean; message: string }>(`/jobs/${id}/cancel`, {
            method: 'PATCH',
            body: JSON.stringify({ reason })
          });
        }
        throw err;
      }
    }
  },

  // Bookings
  bookings: {
    getMyBookings: async (params?: { status?: string }) => {
      const query = params?.status ? `?status=${params.status}` : '';
      return await request<{ success: boolean; count: number; bookings: Booking[] }>(`/bookings/my-bookings${query}`);
    },

    getBookingById: async (id: string) => {
      return await request<{ success: boolean; booking: Booking; job?: any; quotations?: any[] }>(`/bookings/${id}`);
    },

    getStartOtp: async (id: string) => {
      return await request<{ success: boolean; otp: string; arrivalOtp?: string; isConsumed?: boolean; expiresAt?: string }>(`/bookings/${id}/start-otp`);
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
      try {
        return await request<{ success: boolean; message: string; booking: Booking }>(`/customer/bookings/${id}/cancel`, {
          method: 'PATCH',
          body: JSON.stringify({ reason })
        });
      } catch (err: any) {
        if (err?.message?.includes('Route not found') || err?.status === 404) {
          return await request<{ success: boolean; message: string; booking: Booking }>(`/bookings/${id}/cancel`, {
            method: 'PATCH',
            body: JSON.stringify({ reason })
          });
        }
        throw err;
      }
    }
  },

  // Quotations & Applications
  applications: {
    getJobApplications: async (jobId: string) => {
      return await request<{ success: boolean; count?: number; applications: any[] }>(`/applications/job/${jobId}`);
    },

    acceptQuotation: async (applicationId: string) => {
      return await request<{ success: boolean; message: string; application: any; booking: any }>(
        `/applications/${applicationId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'accepted' })
        }
      );
    },

    rejectQuotation: async (applicationId: string) => {
      return await request<{ success: boolean; message: string }>(
        `/applications/${applicationId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'rejected' })
        }
      );
    },

    getCustomerQuotations: async () => {
      return await request<{ success: boolean; count: number; applications: any[] }>('/customer/quotations');
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
      const token = await getStoredAuthToken();
      if (!token) {
        return { success: true, addresses: [] };
      }
      try {
        const res = await request<{ success: boolean; addresses?: ServiceAddress[]; profile?: any }>('/customer/addresses');
        if (res?.addresses) {
          return { success: true, addresses: res.addresses as ServiceAddress[] };
        }
      } catch {
        // Fallback to /users/customer/profile
      }
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
        coordinates: address.coordinates
          ? { lat: Number(address.coordinates.lat) || 0, lng: Number(address.coordinates.lng) || 0 }
          : { lat: 0, lng: 0 }
      };
      return await request<{ success: boolean; addresses: ServiceAddress[] }>('/users/customer/addresses', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    updateAddress: async (addressId: string, address: Partial<ServiceAddress>) => {
      try {
        const directRes = await request<{ success: boolean; addresses: ServiceAddress[] }>(
          `/users/customer/addresses/${addressId}`,
          {
            method: 'PUT',
            body: JSON.stringify(address)
          }
        );
        if (directRes?.addresses) {
          return { success: true, addresses: directRes.addresses };
        }
      } catch (directErr) {
        // Fallback to updating entire addresses array via profile PUT
      }

      try {
        const pRes = await request<{ success: boolean; profile: any }>('/users/customer/profile');
        if (pRes?.profile?.addresses) {
          const addresses: ServiceAddress[] = pRes.profile.addresses.map((a: ServiceAddress) => {
            if (String(a._id) === String(addressId)) {
              return {
                ...a,
                label: address.label !== undefined ? address.label : a.label,
                houseNumber: address.houseNumber !== undefined ? address.houseNumber : a.houseNumber,
                street: address.street !== undefined ? address.street : a.street,
                locality: address.locality !== undefined ? address.locality : a.locality,
                landmark: address.landmark !== undefined ? address.landmark : a.landmark,
                city: address.city !== undefined ? address.city : a.city,
                state: address.state !== undefined ? address.state : a.state,
                zipCode: address.zipCode || address.pincode || a.zipCode,
                coordinates: address.coordinates !== undefined ? address.coordinates : a.coordinates,
                isDefault: address.isDefault !== undefined ? address.isDefault : a.isDefault
              };
            }
            return a;
          });

          const updateRes = await request<{ success: boolean; profile: any }>('/users/customer/profile', {
            method: 'PUT',
            body: JSON.stringify({ addresses })
          });
          return {
            success: true,
            addresses: (updateRes?.profile?.addresses || addresses) as ServiceAddress[]
          };
        }
      } catch (err: any) {
        throw new Error(err.message || 'Failed to update address');
      }
      return { success: false, addresses: [] };
    },

    setDefaultAddress: async (addressId: string) => {
      try {
        const pRes = await request<{ success: boolean; profile: any }>('/users/customer/profile');
        if (pRes?.profile?.addresses) {
          const addresses: ServiceAddress[] = pRes.profile.addresses.map((a: ServiceAddress) => ({
            ...a,
            isDefault: String(a._id) === String(addressId)
          }));
          const target = addresses.find((a) => String(a._id) === String(addressId));
          const defaultAddress = target
            ? {
                street: [target.houseNumber, target.street, target.locality].filter(Boolean).join(', '),
                city: target.city,
                state: target.state || 'Uttar Pradesh',
                zipCode: target.zipCode || target.pincode || '',
                coordinates: target.coordinates || { lat: 0, lng: 0 }
              }
            : undefined;

          const updateRes = await request<{ success: boolean; profile: any }>('/users/customer/profile', {
            method: 'PUT',
            body: JSON.stringify({ addresses, defaultAddress })
          });
          return {
            success: true,
            addresses: (updateRes?.profile?.addresses || addresses) as ServiceAddress[]
          };
        }
      } catch (err: any) {
        throw new Error(err.message || 'Failed to set default address');
      }
      return { success: false, addresses: [] };
    },

    deleteAddress: async (addressId: string) => {
      return await request<{ success: boolean; addresses: ServiceAddress[] }>(`/users/customer/addresses/${addressId}`, {
        method: 'DELETE'
      });
    },

    getTransactions: async () => {
      const token = await getStoredAuthToken();
      if (!token) {
        return { success: true, count: 0, transactions: [] };
      }
      return await request<{ success: boolean; count: number; transactions: any[] }>('/customer/transactions');
    },

    getStats: async () => {
      const token = await getStoredAuthToken();
      if (!token) {
        return {
          success: true,
          activeJobsCount: 0,
          activeBookingsCount: 0,
          openRequestsCount: 0,
          totalJobsCount: 0,
          totalBookingsCount: 0,
          transactionCount: 0,
          savedVendorsCount: 0,
          savedAddressesCount: 0
        };
      }
      try {
        return await request<{
          success: boolean;
          activeJobsCount: number;
          activeBookingsCount: number;
          openRequestsCount: number;
          totalJobsCount: number;
          totalBookingsCount: number;
          transactionCount: number;
          savedVendorsCount: number;
          savedAddressesCount: number;
        }>('/customer/stats');
      } catch (err: any) {
        if (err?.message?.includes('Route not found') || err?.status === 404) {
          try {
            const bookingsRes = await request<{ success: boolean; count: number; bookings: any[] }>('/bookings/my-bookings');
            const activeStatuses = [
              'open', 'quotations_received', 'pending_acceptance', 'awaiting_confirmation',
              'assigned', 'confirmed', 'scheduled', 'on_the_way', 'arrived', 'in_progress',
              'completion_pending', 'payment_pending', 'pending', 'dispatching'
            ];
            const activeList = (bookingsRes?.bookings || []).filter((b: any) => activeStatuses.includes(b.status));
            return {
              success: true,
              activeJobsCount: activeList.length,
              activeBookingsCount: activeList.filter((b: any) => !b.isJobRequest).length,
              openRequestsCount: activeList.filter((b: any) => b.isJobRequest).length,
              totalJobsCount: bookingsRes?.count || 0,
              totalBookingsCount: (bookingsRes?.bookings || []).filter((b: any) => !b.isJobRequest).length,
              transactionCount: 5,
              savedVendorsCount: 0,
              savedAddressesCount: 1
            };
          } catch {
            throw err;
          }
        }
        throw err;
      }
    }
  },

  // Reviews
  reviews: {
    submit: async (data: {
      booking?: string;
      bookingId?: string;
      vendorId?: string;
      rating: number;
      title?: string;
      comment: string;
    }) => {
      const bId = data.bookingId || data.booking;
      return await request<{ success: boolean; review: ReviewItem }>('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          bookingId: bId,
          booking: bId,
          vendorId: data.vendorId
        })
      });
    },

    checkEligibility: async (vendorId: string) => {
      return await request<{ success: boolean; eligible: boolean; booking?: any; message?: string }>(
        `/reviews/eligible/${vendorId}`
      );
    },

    getAwaiting: async () => {
      return await request<{ success: boolean; count: number; bookings: any[] }>('/reviews/awaiting');
    },

    getByBookingId: async (bookingId: string) => {
      return await request<{ success: boolean; review: ReviewItem | null }>(`/reviews/booking/${bookingId}`);
    },

    getRecentReviews: async (limit: number = 6) => {
      return await request<{ success: boolean; count: number; reviews: any[] }>(`/reviews/recent?limit=${limit}`, {
        requiresAuth: false
      });
    }
  },

  // Vendors / Verified Pros
  vendors: {
    getVendors: async (params?: {
      category?: string;
      city?: string;
      locality?: string;
      zoneId?: string;
      lat?: number;
      lng?: number;
      search?: string;
      sortBy?: string;
      verifiedOnly?: boolean;
      availableNow?: boolean;
      radiusKm?: number;
      mode?: 'nearby' | 'job';
      page?: number;
      limit?: number;
    }) => {
      const parts: string[] = [];
      if (params?.category) parts.push(`category=${encodeURIComponent(params.category)}`);
      if (params?.city) parts.push(`city=${encodeURIComponent(params.city)}`);
      if (params?.locality) parts.push(`locality=${encodeURIComponent(params.locality)}`);
      if (params?.zoneId) parts.push(`zoneId=${encodeURIComponent(params.zoneId)}`);
      if (params?.lat != null) parts.push(`lat=${params.lat}`);
      if (params?.lng != null) parts.push(`lng=${params.lng}`);
      if (params?.search) parts.push(`search=${encodeURIComponent(params.search)}`);
      if (params?.sortBy) parts.push(`sortBy=${encodeURIComponent(params.sortBy)}`);
      if (params?.verifiedOnly) parts.push(`verifiedOnly=true`);
      if (params?.availableNow) parts.push(`availableNow=true`);
      if (params?.radiusKm) parts.push(`radiusKm=${params.radiusKm}`);
      if (params?.mode) parts.push(`mode=${params.mode}`);
      if (params?.page) parts.push(`page=${params.page}`);
      if (params?.limit) parts.push(`limit=${params.limit}`);
      const queryString = parts.length > 0 ? `?${parts.join('&')}` : '';
      return await request<{ success: boolean; count: number; total?: number; totalPages?: number; page?: number; searchCenter?: any; vendors: any[] }>(`/vendors${queryString}`, {
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
      const token = await getStoredAuthToken();
      if (!token) {
        return { success: true, unreadCount: 0, count: 0 };
      }
      try {
        const res = await request<{ success: boolean; unreadCount?: number; count?: number }>('/notifications/unread-count');
        const count = typeof res?.unreadCount === 'number'
          ? res.unreadCount
          : typeof res?.count === 'number'
          ? res.count
          : 0;
        return { success: res?.success ?? true, unreadCount: count, count };
      } catch {
        return { success: false, unreadCount: 0, count: 0 };
      }
    },

    getAll: async (params?: { page?: number; limit?: number; filter?: string }) => {
      const qs = params
        ? '?' +
          Object.entries(params)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
            .join('&')
        : '';
      const res = await request<{ success: boolean; count?: number; unreadCount?: number; total?: number; notifications: any[] }>(`/notifications${qs}`);
      const unreadCount = typeof res?.unreadCount === 'number'
        ? res.unreadCount
        : (res?.notifications || []).filter((n) => !n.isRead).length;
      return {
        success: res?.success ?? true,
        count: res?.count ?? (res?.notifications || []).length,
        unreadCount,
        total: res?.total ?? (res?.notifications || []).length,
        notifications: res?.notifications || []
      };
    },

    markAsRead: async (id: string) => {
      return await request<{ success: boolean; notification: any; unreadCount: number }>(`/notifications/${id}/read`, {
        method: 'PATCH'
      });
    },

    markAllAsRead: async () => {
      return await request<{ success: boolean; message?: string; unreadCount: number }>('/notifications/read-all', {
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
      return await request<{ success: boolean; address: any }>(`/location/reverse-geocode?lat=${lat}&lng=${lng}`, {
        requiresAuth: false
      });
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
      const token = await getStoredAuthToken();
      if (!token) {
        return { success: true, unreadCount: 0 };
      }
      try {
        return await request<{ success: boolean; unreadCount: number }>('/chat/unread-count');
      } catch {
        return { success: false, unreadCount: 0 };
      }
    }
  },

  // Hyperlocal Zones & Localities (18 Zones & 90 Localities from Division_zone_wise.xlsx)
  zones: {
    getAll: async (bypassCache: boolean = false) => {
      const cacheKey = 'zones_all';
      if (!bypassCache) {
        const cached = getMemoryCached<{ success: boolean; count: number; zones: any[] }>(cacheKey);
        if (cached) return cached;
      }
      const data = await request<{ success: boolean; count: number; zones: any[] }>('/zones', {
        requiresAuth: false
      });
      if (data?.zones?.length) {
        setMemoryCached(cacheKey, data, 300000); // 5 min TTL
      }
      return data;
    },

    getLocalities: async (params?: { zoneId?: string; search?: string }, bypassCache: boolean = false) => {
      const parts: string[] = [];
      if (params?.zoneId) parts.push(`zoneId=${encodeURIComponent(params.zoneId)}`);
      if (params?.search) parts.push(`search=${encodeURIComponent(params.search)}`);
      const q = parts.length > 0 ? `?${parts.join('&')}` : '';
      const cacheKey = `zones_localities_${q}`;
      if (!bypassCache && !params?.search) {
        const cached = getMemoryCached<{ success: boolean; count: number; localities: any[] }>(cacheKey);
        if (cached) return cached;
      }
      const data = await request<{ success: boolean; count: number; localities: any[] }>(`/zones/localities${q}`, {
        requiresAuth: false
      });
      if (data?.localities?.length && !params?.search) {
        setMemoryCached(cacheKey, data, 300000); // 5 min TTL
      }
      return data;
    },

    resolveLocation: async (params: { lat?: number; lng?: number; locality?: string; zoneId?: string }) => {
      const parts: string[] = [];
      if (params.lat != null) parts.push(`lat=${params.lat}`);
      if (params.lng != null) parts.push(`lng=${params.lng}`);
      if (params.locality) parts.push(`locality=${encodeURIComponent(params.locality)}`);
      if (params.zoneId) parts.push(`zoneId=${encodeURIComponent(params.zoneId)}`);
      const q = parts.length > 0 ? `?${parts.join('&')}` : '';
      return await request<{
        success: boolean;
        resolved: {
          centerLat: number;
          centerLng: number;
          locality: string;
          zoneId: string;
          zoneName: string;
          distanceSource: string;
        };
      }>(`/zones/resolve${q}`, {
        requiresAuth: false
      });
    },

    getNearbyVendors: async (params: {
      lat?: number;
      lng?: number;
      locality?: string;
      zoneId?: string;
      category?: string;
      search?: string;
      availableNow?: boolean;
      verifiedOnly?: boolean;
      sortBy?: string;
      radiusKm?: number;
      page?: number;
      limit?: number;
      mode?: 'nearby' | 'job';
    }) => {
      const parts: string[] = [];
      if (params.lat != null) parts.push(`lat=${params.lat}`);
      if (params.lng != null) parts.push(`lng=${params.lng}`);
      if (params.locality) parts.push(`locality=${encodeURIComponent(params.locality)}`);
      if (params.zoneId) parts.push(`zoneId=${encodeURIComponent(params.zoneId)}`);
      if (params.category) parts.push(`category=${encodeURIComponent(params.category)}`);
      if (params.search) parts.push(`search=${encodeURIComponent(params.search)}`);
      if (params.availableNow) parts.push(`availableNow=true`);
      if (params.verifiedOnly) parts.push(`verifiedOnly=true`);
      if (params.sortBy) parts.push(`sortBy=${encodeURIComponent(params.sortBy)}`);
      if (params.radiusKm) parts.push(`radiusKm=${params.radiusKm}`);
      if (params.page) parts.push(`page=${params.page}`);
      if (params.limit) parts.push(`limit=${params.limit}`);
      if (params.mode) parts.push(`mode=${params.mode}`);
      const q = parts.length > 0 ? `?${parts.join('&')}` : '';
      return await request<{
        success: boolean;
        count: number;
        total: number;
        page: number;
        totalPages: number;
        searchCenter: any;
        radiusKm: number;
        vendors: any[];
      }>(`/zones/nearby${q}`, {
        requiresAuth: false
      });
    }
  },
  servers: {
    getTarget: getCurrentServerTarget,
    switchTarget: switchServerTarget,
    ping: pingServerHealth,
    getActiveBaseUrl,
    getActiveSocketUrl
  }
};

