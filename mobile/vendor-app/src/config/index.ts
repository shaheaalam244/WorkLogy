const isProd = !__DEV__;
const DEFAULT_DEV_API = 'http://76.13.246.224:5001/api';
const DEFAULT_PROD_API = 'http://76.13.246.224:5001/api';
const DEFAULT_DEV_SOCKET = 'http://76.13.246.224:5001';
const DEFAULT_PROD_SOCKET = 'http://76.13.246.224:5001';

export const CONFIG = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || (isProd ? DEFAULT_PROD_API : DEFAULT_DEV_API),
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || (isProd ? DEFAULT_PROD_SOCKET : DEFAULT_DEV_SOCKET),
  APP_NAME: 'WorkLogy Pro',
  VERSION: '1.0.0'
};
