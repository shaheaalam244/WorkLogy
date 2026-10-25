import api from './axios';

export const adminAPI = {
  // 1. Dashboard Overview
  getStats: async () => {
    const res = await api.get('/admin/stats');
    return res.data;
  },

  // 2. Professionals & Approvals
  getVendors: async (params = {}) => {
    const res = await api.get('/admin/vendors', { params });
    return res.data;
  },

  getVendorById: async (id) => {
    const res = await api.get(`/admin/vendors/${id}`);
    return res.data;
  },

  updateVendorApproval: async (id, data) => {
    const res = await api.patch(`/admin/vendors/${id}/approval`, data);
    return res.data;
  },

  reviewVendorDocument: async (vendorId, docIndex, data) => {
    const res = await api.patch(`/admin/vendors/${vendorId}/documents/${docIndex}`, data);
    return res.data;
  },

  getDocumentUrl: (vendorId, docIndex, mode = 'view') => {
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api');
    return `${base}/admin/vendors/${vendorId}/documents/${docIndex}/${mode}`;
  },

  addVendorNote: async (id, data) => {
    const res = await api.post(`/admin/vendors/${id}/notes`, data);
    return res.data;
  },

  // 2b. Identity Verification Requests
  getVerifications: async (params = {}) => {
    const res = await api.get('/admin/verifications', { params });
    return res.data;
  },

  getVerificationById: async (id) => {
    const res = await api.get(`/admin/verifications/${id}`);
    return res.data;
  },

  reviewVerification: async (id, data) => {
    const res = await api.patch(`/admin/verifications/${id}`, data);
    return res.data;
  },

  toggleVendorService: async (vendorId, serviceId, data) => {
    const res = await api.patch(`/admin/vendors/${vendorId}/services/${serviceId}`, data);
    return res.data;
  },

  // 3. Customers
  getCustomers: async (params = {}) => {
    const res = await api.get('/admin/customers', { params });
    return res.data;
  },

  updateCustomerStatus: async (id, data) => {
    const res = await api.patch(`/admin/customers/${id}/status`, data);
    return res.data;
  },

  // 4. Categories & Catalog Services
  getCategories: async () => {
    const res = await api.get('/admin/categories');
    return res.data;
  },

  createCategory: async (data) => {
    const res = await api.post('/admin/categories', data);
    return res.data;
  },

  updateCategory: async (id, data) => {
    const res = await api.put(`/admin/categories/${id}`, data);
    return res.data;
  },

  toggleCategoryStatus: async (id) => {
    const res = await api.patch(`/admin/categories/${id}/status`);
    return res.data;
  },

  getCatalogServices: async (params = {}) => {
    const res = await api.get('/admin/catalog-services', { params });
    return res.data;
  },

  createCatalogService: async (data) => {
    const res = await api.post('/admin/catalog-services', data);
    return res.data;
  },

  updateCatalogService: async (id, data) => {
    const res = await api.put(`/admin/catalog-services/${id}`, data);
    return res.data;
  },

  toggleCatalogServiceStatus: async (id) => {
    const res = await api.patch(`/admin/catalog-services/${id}/status`);
    return res.data;
  },

  // 5. Jobs & Emergency Control
  getJobs: async (params = {}) => {
    const res = await api.get('/admin/jobs', { params });
    return res.data;
  },

  reassignJob: async (id, data) => {
    const res = await api.patch(`/admin/jobs/${id}/reassign`, data);
    return res.data;
  },

  retryEmergencyDispatch: async (id) => {
    const res = await api.post(`/admin/jobs/${id}/retry-dispatch`);
    return res.data;
  },

  // 6. Payments & Ledger
  getTransactions: async (params = {}) => {
    const res = await api.get('/admin/transactions', { params });
    return res.data;
  },

  // 7. Disputes & Reviews Moderation
  getDisputes: async (params = {}) => {
    const res = await api.get('/admin/disputes', { params });
    return res.data;
  },

  resolveDispute: async (id, data) => {
    const res = await api.patch(`/admin/disputes/${id}/resolve`, data);
    return res.data;
  },

  getReports: async (params = {}) => {
    const res = await api.get('/admin/reports', { params });
    return res.data;
  },

  resolveReport: async (id, data) => {
    const res = await api.patch(`/admin/reports/${id}/resolve`, data);
    return res.data;
  },

  getReviews: async (params = {}) => {
    const res = await api.get('/admin/reviews', { params });
    return res.data;
  },

  moderateReview: async (id, data) => {
    const res = await api.patch(`/admin/reviews/${id}/moderate`, data);
    return res.data;
  },

  // 8. Admin Notifications
  getNotifications: async () => {
    const res = await api.get('/admin/notifications');
    return res.data;
  },

  markNotificationRead: async (id = 'all') => {
    const res = await api.patch(`/admin/notifications/${id}/read`);
    return res.data;
  },

  // 9. Platform Settings
  getSettings: async () => {
    const res = await api.get('/admin/settings');
    return res.data;
  },

  updateSettings: async (data) => {
    const res = await api.put('/admin/settings', data);
    return res.data;
  },

  // 10. Audit Logs
  getLogs: async (params = {}) => {
    const res = await api.get('/admin/logs', { params });
    return res.data;
  },

  // 11. Areas & Geo-Coverage
  getAreas: async () => {
    const res = await api.get('/areas');
    return res.data;
  },

  createArea: async (data) => {
    const res = await api.post('/areas', data);
    return res.data;
  },

  deleteArea: async (id) => {
    const res = await api.delete(`/areas/${id}`);
    return res.data;
  }
};
