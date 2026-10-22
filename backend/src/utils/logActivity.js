import ActivityLog from '../models/ActivityLog.js';

export const logActivity = async ({ userId, role, action, targetType, targetId, details, ipAddress }) => {
  try {
    if (!userId) return;
    await ActivityLog.create({
      user: userId,
      role: role || 'system',
      action,
      targetType,
      targetId,
      details,
      ipAddress: ipAddress || '127.0.0.1',
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Failed to record activity log:', error.message);
  }
};
