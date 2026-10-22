import { COLORS } from '../theme/colors';

export { COLORS };

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'worklogy_vendor_auth_token',
  AUTH_USER: 'worklogy_vendor_auth_user'
};

export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  EMERGENCY_BROADCAST: 'emergency_broadcast',
  JOB_ASSIGNED: 'job_assigned',
  JOB_TAKEN: 'job_taken',
  STATUS_UPDATE: 'booking_status_updated',
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message'
};
