import api from './axios';

export const vendorAPI = {
  getDashboardStats: async () => {
    const res = await api.get('/vendors/dashboard-stats');
    return res.data;
  },

  getAll: async (params) => {
    const res = await api.get('/vendors', { params });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/vendors/${id}`);
    return res.data;
  },

  getProfile: async () => {
    const res = await api.get('/vendors/profile/me');
    return res.data;
  },

  updateProfile: async (data) => {
    const res = await api.put('/vendors/profile/me', data);
    return res.data;
  },

  getMyServices: async (params) => {
    const res = await api.get('/vendors/services/my', { params });
    return res.data;
  },

  createService: async (serviceData) => {
    const res = await api.post('/vendors/services', serviceData);
    return res.data;
  },

  getServiceById: async (serviceId) => {
    const res = await api.get(`/vendors/services/${serviceId}`);
    return res.data;
  },

  updateService: async (serviceId, data) => {
    const res = await api.put(`/vendors/services/${serviceId}`, data);
    return res.data;
  },

  updateServiceStatus: async (serviceId, status) => {
    const res = await api.patch(`/vendors/services/${serviceId}/status`, { status });
    return res.data;
  },

  deleteService: async (serviceId) => {
    const res = await api.delete(`/vendors/services/${serviceId}`);
    return res.data;
  },

  getEarnings: async () => {
    const res = await api.get('/vendors/earnings');
    return res.data;
  },

  getTransactions: async (params) => {
    const res = await api.get('/vendors/transactions', { params });
    return res.data;
  },

  getAvailability: async () => {
    const res = await api.get('/vendors/availability');
    return res.data;
  },

  updateAvailability: async (availabilityData) => {
    const res = await api.put('/vendors/availability', availabilityData);
    return res.data;
  },

  getCalendar: async () => {
    const res = await api.get('/vendors/calendar');
    return res.data;
  },

  getVerificationStatus: async () => {
    const res = await api.get('/vendors/verification/status');
    return res.data;
  },

  submitVerification: async (payload) => {
    // Accepts either raw documents array or { verificationType, idNumber, documents, consent }
    const body = Array.isArray(payload) ? { documents: payload, consent: true } : payload;
    const res = await api.post('/vendors/verification', body);
    return res.data;
  }
};
