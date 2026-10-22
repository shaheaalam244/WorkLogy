import api from './axios';

export const reportAPI = {
  createReport: async (data) => {
    const res = await api.post('/reports', data);
    return res.data;
  },

  getMyReports: async () => {
    const res = await api.get('/reports/my');
    return res.data;
  },

  getReportById: async (id) => {
    const res = await api.get(`/reports/${id}`);
    return res.data;
  }
};
