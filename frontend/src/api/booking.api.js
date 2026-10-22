import api from './axios';

export const bookingAPI = {
  getVendorBookings: async (params) => {
    const res = await api.get('/bookings/vendor', { params });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/bookings/${id}`);
    return res.data;
  },

  updateStatus: async (id, statusData) => {
    const res = await api.patch(`/bookings/${id}/status`, statusData);
    return res.data;
  },

  reschedule: async (id, rescheduleData) => {
    const res = await api.patch(`/bookings/${id}/reschedule`, rescheduleData);
    return res.data;
  },

  getStartOtp: async (id) => {
    const res = await api.get(`/bookings/${id}/start-otp`);
    return res.data;
  },

  verifyArrival: async (id, locationData) => {
    const res = await api.post(`/bookings/${id}/verify-arrival`, locationData);
    return res.data;
  },

  verifyStartOtp: async (id, otpData) => {
    const res = await api.post(`/bookings/${id}/verify-start-otp`, otpData);
    return res.data;
  },

  verifyStart: async (id, payload) => {
    const res = await api.post(`/bookings/${id}/verify-start`, payload);
    return res.data;
  },

  createDirectBooking: async (data) => {
    const res = await api.post('/bookings/direct', data);
    return res.data;
  },

  respondDirectBooking: async (id, data) => {
    const res = await api.patch(`/bookings/${id}/respond`, data);
    return res.data;
  },

  regenerateStartOtp: async (id) => {
    const res = await api.post(`/bookings/${id}/regenerate-start-otp`);
    return res.data;
  },

  getByJobId: async (jobId) => {
    const res = await api.get(`/bookings/by-job/${jobId}`);
    return res.data;
  },

  approveCompletion: async (id, data = {}) => {
    const res = await api.post(`/bookings/${id}/approve-completion`, data);
    return res.data;
  }
};
