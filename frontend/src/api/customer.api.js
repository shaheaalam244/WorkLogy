import api from './axios';

export const customerAPI = {
  getDashboardSummary: async () => {
    const res = await api.get('/customer/dashboard/summary');
    return res.data;
  },

  getBookings: async (params) => {
    const res = await api.get('/customer/bookings', { params });
    return res.data;
  },

  cancelBooking: async (id, reason) => {
    const res = await api.patch(`/customer/bookings/${id}/cancel`, { reason });
    return res.data;
  },

  getQuotations: async () => {
    const res = await api.get('/customer/quotations');
    return res.data;
  },

  getTransactions: async () => {
    const res = await api.get('/customer/transactions');
    return res.data;
  },

  getProfile: async () => {
    const res = await api.get('/users/customer/profile');
    return res.data;
  },

  updateProfile: async (data) => {
    const res = await api.put('/users/customer/profile', data);
    return res.data;
  },

  addAddress: async (data) => {
    const res = await api.post('/users/customer/addresses', data);
    return res.data;
  },

  removeAddress: async (addressId) => {
    const res = await api.delete(`/users/customer/addresses/${addressId}`);
    return res.data;
  },

  toggleSavedVendor: async (vendorId) => {
    const res = await api.post('/users/customer/saved-vendors', { vendorId });
    return res.data;
  }
};
