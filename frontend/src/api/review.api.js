import api from './axios';

export const reviewAPI = {
  getVendorReviews: async (vendorId, params = {}) => {
    const res = await api.get(`/reviews/vendor/${vendorId}`, { params });
    return res.data;
  },

  getMyReviews: async () => {
    const res = await api.get('/reviews/me');
    return res.data;
  },

  respondToReview: async (reviewId, text) => {
    const res = await api.post(`/reviews/${reviewId}/respond`, { text });
    return res.data;
  },

  createReview: async (reviewData) => {
    const res = await api.post('/reviews', reviewData);
    return res.data;
  },

  submitBookingReview: async (bookingId, reviewData) => {
    const res = await api.post(`/bookings/${bookingId}/reviews`, reviewData);
    return res.data;
  },

  getBookingReview: async (bookingId) => {
    const res = await api.get(`/bookings/${bookingId}/review`);
    return res.data;
  },

  getAwaitingReviews: async () => {
    const res = await api.get('/reviews/awaiting');
    return res.data;
  },

  checkEligibility: async (vendorId) => {
    const res = await api.get(`/reviews/eligible/${vendorId}`);
    return res.data;
  }
};

export default reviewAPI;
