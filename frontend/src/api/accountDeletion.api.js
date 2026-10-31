import api from './axios';

export const accountDeletionAPI = {
  requestOtp: async ({ phone, role }) => {
    const res = await api.post('/account-deletion/request-otp', { phone, role });
    return res.data;
  },

  submitRequest: async ({ phone, role, otp, email, reason, confirmationAcknowledged }) => {
    const res = await api.post('/account-deletion/submit', {
      phone,
      role,
      otp,
      email,
      reason,
      confirmationAcknowledged
    });
    return res.data;
  },

  checkStatus: async ({ referenceId, phone }) => {
    const res = await api.post('/account-deletion/status', { referenceId, phone });
    return res.data;
  }
};
