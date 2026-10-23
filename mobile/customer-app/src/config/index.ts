const isProd = !__DEV__;
const DEFAULT_DEV_API = 'http://10.211.183.171:5001/api';
const DEFAULT_PROD_API = 'https://api.worklogy.in/api';
const DEFAULT_DEV_SOCKET = 'http://10.211.183.171:5001';
const DEFAULT_PROD_SOCKET = 'https://api.worklogy.in';

export const CONFIG = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || (isProd ? DEFAULT_PROD_API : DEFAULT_DEV_API),
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || (isProd ? DEFAULT_PROD_SOCKET : DEFAULT_DEV_SOCKET),
  APP_NAME: 'WorkLogy Customer',
  VERSION: '1.0.0'
};
