import api from './axios';

export const locationAPI = {
  reverseGeocode: async (latitude, longitude) => {
    const res = await api.post('/location/reverse-geocode', { latitude, longitude });
    return res.data;
  }
};

export default locationAPI;
