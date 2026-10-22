import { COLORS } from '../theme/colors';

export { COLORS };

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'worklogy_customer_auth_token',
  AUTH_USER: 'worklogy_customer_auth_user',
  SAVED_LOCATION: 'worklogy_customer_location'
};

export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  EMERGENCY_BROADCAST: 'emergency_broadcast',
  JOB_ASSIGNED: 'job_assigned',
  STATUS_UPDATE: 'booking_status_updated',
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message'
};
