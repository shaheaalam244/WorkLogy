import api from './axios';

export const supportAPI = {
  getMyTickets: async () => {
    const res = await api.get('/support/my');
    return res.data;
  },

  createTicket: async (ticketData) => {
    const res = await api.post('/support', ticketData);
    return res.data;
  },

  replyTicket: async (id, message) => {
    const res = await api.post(`/support/${id}/reply`, { message });
    return res.data;
  }
};
