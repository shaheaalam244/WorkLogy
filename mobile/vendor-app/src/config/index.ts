const isProd = !__DEV__;
const VPS_HOST = '76.13.246.224:5001';
const DEFAULT_DEV_API = `http://${VPS_HOST}/api`;
const DEFAULT_PROD_API = `http://${VPS_HOST}/api`;
const DEFAULT_DEV_SOCKET = `http://${VPS_HOST}`;
const DEFAULT_PROD_SOCKET = `http://${VPS_HOST}`;

export const CONFIG = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || (isProd ? DEFAULT_PROD_API : DEFAULT_DEV_API),
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || (isProd ? DEFAULT_PROD_SOCKET : DEFAULT_DEV_SOCKET),
  APP_NAME: 'WorkLogy Pro',
  VERSION: '1.0.0'
};

