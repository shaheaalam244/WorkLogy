import api from './axios';

export const categoryAPI = {
  getAll: async () => {
    const res = await api.get('/categories');
    return res.data;
  },
  getBySlug: async (slug) => {
    const res = await api.get(`/categories/${slug}`);
    return res.data;
  }
};
