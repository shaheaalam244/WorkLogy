import { COLORS } from '../theme/colors';

export { COLORS };

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'worklogy_vendor_auth_token',
  REFRESH_TOKEN: 'worklogy_vendor_refresh_token',
  AUTH_USER: 'worklogy_vendor_auth_user',
  PUSH_TOKEN: 'worklogy_vendor_push_token',
  SERVER_TARGET: 'worklogy_server_target',
  CUSTOM_LOCAL_HOST: 'worklogy_custom_local_host'
};

export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  EMERGENCY_BROADCAST: 'emergency_broadcast',
  JOB_ASSIGNED: 'job_assigned',
  JOB_TAKEN: 'job_taken',
  STATUS_UPDATE: 'booking_status_updated',
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  NEW_MESSAGE_NOTIFICATION: 'new_message_notification',
  MESSAGES_READ: 'messages_read',
  NEW_NOTIFICATION: 'new_notification',
  NOTIFICATIONS_READ: 'notifications_read'
};
