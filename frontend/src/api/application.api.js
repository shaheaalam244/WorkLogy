import api from './axios';

export const applicationAPI = {
  apply: async (data) => {
    const res = await api.post('/applications', data);
    return res.data;
  },

  getVendorApplications: async () => {
    const res = await api.get('/applications/vendor');
    return res.data;
  },

  getJobApplications: async (jobId) => {
    const res = await api.get(`/applications/job/${jobId}`);
    return res.data;
  },

  withdraw: async (id) => {
    const res = await api.patch(`/applications/${id}/withdraw`);
    return res.data;
  },

  updateStatus: async (id, status) => {
    const res = await api.patch(`/applications/${id}/status`, { status });
    return res.data;
  }
};
