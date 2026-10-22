import { useState, useEffect } from 'react';

export const useLocation = () => {
  const [location, setLocation] = useState({
    city: 'Lucknow, UP',
    lat: 26.8467,
    lng: 80.9462,
    loading: false
  });

  const detectLocation = () => {
    setLocation(prev => ({ ...prev, loading: true }));
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            city: 'Nearby Area',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            loading: false
          });
        },
        () => {
          setLocation(prev => ({ ...prev, loading: false }));
        }
      );
    } else {
      setLocation(prev => ({ ...prev, loading: false }));
    }
  };

  return { location, detectLocation };
};
