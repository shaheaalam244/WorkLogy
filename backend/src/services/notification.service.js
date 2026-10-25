import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendEmail } from './email.service.js';
import { sendPushNotification } from './pushNotification.service.js';

/**
 * Core In-App & Email Notification Dispatcher
 * Enforces deduplication via idempotency keys, persists in MongoDB,
 * emits real-time Socket.IO events, and dispatches branded emails according to user preferences.
 */
export async function createNotification({
  recipientId,
  recipient,
  senderId = null,
  sender = null,
  type = 'system',
  title,
  message,
  link = '',
  relatedResource = null,
  idempotencyKey = null,
  sendEmailNotification = true,
  sendPush = true,
  emailSubject = null,
  emailDetails = []
}) {
  const targetRecipient = recipientId || recipient;
  const targetSender = senderId || sender;
  if (!targetRecipient) return null;

  try {
    // 1. Deduplication Guard: Check if event was already dispatched
    if (idempotencyKey) {
      const existing = await Notification.findOne({
        recipient: targetRecipient,
        idempotencyKey
      });
      if (existing) {
        return { success: true, duplicate: true, notification: existing };
      }
    }

    // 2. Persist In-App Notification Record in MongoDB
    const notifData = {
      recipient: targetRecipient,
      sender: targetSender,
      type,
      title,
      message,
      link,
      isRead: false
    };

    if (relatedResource) {
      notifData.relatedResource = relatedResource;
    }
    if (idempotencyKey) {
      notifData.idempotencyKey = idempotencyKey;
    }

    const notification = await Notification.create(notifData);

    // 3. Process Remote Push Notification if enabled
    if (sendPush) {
      try {
        let channelId = 'general';
        const pushData = {
          notificationId: notification._id.toString(),
          type,
          link: link || ''
        };

        if (type === 'message') {
          channelId = 'messages';
          pushData.type = 'message';
          if (relatedResource?.resourceId) {
            pushData.conversationId = relatedResource.resourceId.toString();
          }
        } else if (type === 'job_alert') {
          channelId = 'job-requests';
          pushData.type = 'job';
          if (relatedResource?.resourceId) {
            pushData.jobId = relatedResource.resourceId.toString();
          }
        } else if (
          type === 'booking_confirmed' ||
          type === 'job_assigned' ||
          type === 'status_change' ||
          type === 'cancellation'
        ) {
          channelId = 'bookings';
          pushData.type = 'booking';
          if (relatedResource?.resourceId) {
            pushData.bookingId = relatedResource.resourceId.toString();
          }
        } else if (
          type === 'quotation_received' ||
          type === 'application_received' ||
          type === 'proposal_accepted'
        ) {
          channelId = 'job-requests';
          pushData.type = 'job';
          if (relatedResource?.resourceId) {
            pushData.jobId = relatedResource.resourceId.toString();
          }
        }

        const unreadCount = await Notification.countDocuments({
          recipient: targetRecipient,
          isRead: false
        }).catch(() => 1);

        sendPushNotification({
          recipientUserIds: [targetRecipient],
          title,
          body: message,
          data: pushData,
          channelId,
          priority: 'high',
          sound: 'default',
          badge: unreadCount
        }).catch((err) => {
          console.warn('Non-fatal: Push delivery error in notification service:', err.message);
        });
      } catch (pushErr) {
        console.warn('Push notification dispatch setup warning:', pushErr.message);
      }
    }

    // 4. Process Email Notification if enabled
    if (sendEmailNotification) {
      try {
        const recipientUser = await User.findById(targetRecipient).select('name email notificationPreferences');
        if (recipientUser && recipientUser.email) {
          const prefs = recipientUser.notificationPreferences || {};

          // Check event-specific user preferences
          let isAllowedByPreferences = true;
          if (type === 'quotation_received' || type === 'application_received') {
            isAllowedByPreferences = prefs.emailQuotations !== false;
          } else if (type === 'booking_confirmed') {
            isAllowedByPreferences = prefs.emailBookings !== false;
          } else if (type === 'status_change') {
            isAllowedByPreferences = prefs.emailStatusUpdates !== false;
          } else if (type === 'cancellation') {
            isAllowedByPreferences = prefs.emailCancellations !== false;
          }

          if (isAllowedByPreferences) {
            const emailRes = await sendEmail({
              to: recipientUser.email,
              recipientName: recipientUser.name || 'Valued User',
              subject: emailSubject || title,
              title,
              message,
              actionText: 'View Details in WorkLogy',
              actionUrl: link,
              details: emailDetails,
              idempotencyKey
            });

            notification.emailStatus = emailRes.status || 'sent';
            notification.deliveryAttempts = 1;
            await notification.save();
          } else {
            notification.emailStatus = 'blocked_preferences';
            await notification.save();
          }
        }
      } catch (emailErr) {
        // Non-blocking: Email failure must NEVER fail the primary business transaction
        console.warn('Email dispatch non-fatal error:', emailErr.message);
        notification.emailStatus = 'failed';
        notification.emailError = emailErr.message;
        await notification.save().catch(() => {});
      }
    }

    return { success: true, notification };
  } catch (error) {
    console.error('Failed to create notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Event A: New Quotation Received
 * Trigger: Vendor submits quotation/proposal
 * Recipient: Customer owning the job
 */
export async function notifyNewQuotation({
  customerId,
  vendorId,
  job,
  proposedAmount,
  quotationId = null
}) {
  const amountFormatted = proposedAmount ? `₹${proposedAmount}` : 'an agreed rate';
  const jobTitle = job.title || 'your service request';

  return await createNotification({
    recipientId: customerId,
    senderId: vendorId,
    type: 'quotation_received',
    title: 'New quotation received',
    message: `A service professional has submitted a quotation of ${amountFormatted} on "${jobTitle}".`,
    link: `/jobs/${job._id || job.id}`,
    relatedResource: {
      resourceType: 'quotation',
      resourceId: quotationId || job._id
    },
    idempotencyKey: quotationId ? `quotation_${quotationId}` : `quotation_${job._id}_${vendorId}`,
    sendEmailNotification: true,
    emailSubject: `New quotation received on "${jobTitle}"`,
    emailDetails: [
      { label: 'Job Title', value: jobTitle },
      { label: 'Quoted Amount', value: amountFormatted },
      { label: 'Service Category', value: job.category?.name || 'General Trade' },
      { label: 'Status', value: 'Quotation Available' }
    ]
  });
}

/**
 * Event B: Booking Confirmation
 * Trigger: Booking confirmed (via quotation accept or instant claim)
 * Recipients: Customer AND Assigned Vendor
 */
export async function notifyBookingConfirmed({
  customerId,
  vendorId,
  booking,
  jobTitle
}) {
  const bookingRef = booking.bookingReference || `BK-${booking._id?.toString().slice(-6) || 'CONFIRMED'}`;
  const scheduledTime = booking.timeSlot || 'Scheduled Time';

  const results = [];

  // 1. Notify Customer
  if (customerId) {
    const custRes = await createNotification({
      recipientId: customerId,
      senderId: vendorId,
      type: 'booking_confirmed',
      title: 'Booking confirmed',
      message: `Your service booking ${bookingRef} for "${jobTitle}" has been confirmed. Your contractor is scheduled for ${scheduledTime}.`,
      link: `/customer/bookings`,
      relatedResource: {
        resourceType: 'booking',
        resourceId: booking._id
      },
      idempotencyKey: `booking_confirmed_customer_${booking._id}`,
      sendEmailNotification: true,
      emailSubject: `Booking Confirmed — ${bookingRef}`,
      emailDetails: [
        { label: 'Booking Reference', value: bookingRef },
        { label: 'Service Title', value: jobTitle },
        { label: 'Schedule', value: scheduledTime },
        { label: 'Status', value: 'Confirmed & Escrow Secured' }
      ]
    });
    results.push(custRes);
  }

  // 2. Notify Assigned Vendor
  if (vendorId) {
    const vendRes = await createNotification({
      recipientId: vendorId,
      senderId: customerId,
      type: 'booking_confirmed',
      title: 'Booking confirmed — Job Assigned',
      message: `You have been confirmed for "${jobTitle}" (${bookingRef}). Review schedule and customer service address in your dashboard.`,
      link: `/vendor/bookings`,
      relatedResource: {
        resourceType: 'booking',
        resourceId: booking._id
      },
      idempotencyKey: `booking_confirmed_vendor_${booking._id}`,
      sendEmailNotification: true,
      emailSubject: `Confirmed Assignment — ${bookingRef}`,
      emailDetails: [
        { label: 'Booking Reference', value: bookingRef },
        { label: 'Service Title', value: jobTitle },
        { label: 'Schedule', value: scheduledTime },
        { label: 'Status', value: 'Assigned to You' }
      ]
    });
    results.push(vendRes);
  }

  return results;
}

/**
 * Event C: Job or Booking Status Change
 * Trigger: Meaningful status transitions (in_progress, completion_pending, completed)
 * Recipients: Customer and/or Vendor
 */
export async function notifyStatusChange({
  recipientId,
  senderId = null,
  booking,
  jobTitle,
  newStatus,
  customMessage = null
}) {
  let title = 'Booking status updated';
  let message = customMessage;
  let link = '/customer/bookings';

  switch (newStatus) {
    case 'in_progress':
      title = 'Work in progress';
      message = message || `Technician has started work on "${jobTitle}". Work is actively underway.`;
      break;
    case 'completion_pending':
      title = 'Work completed — Approval requested';
      message = message || `Your technician has marked "${jobTitle}" as completed. Please review workmanship and approve completion.`;
      break;
    case 'completed':
      title = 'Service completed successfully';
      message = message || `The service "${jobTitle}" has been verified and completed. Thank you for using WorkLogy!`;
      break;
    case 'rescheduled':
      title = 'Service rescheduled';
      message = message || `The scheduled time for "${jobTitle}" has been updated.`;
      break;
    default:
      message = message || `Your service request "${jobTitle}" has been updated to ${newStatus}.`;
  }

  return await createNotification({
    recipientId,
    senderId,
    type: 'status_change',
    title,
    message,
    link,
    relatedResource: {
      resourceType: 'booking',
      resourceId: booking._id || booking.id
    },
    idempotencyKey: `status_${booking._id || booking.id}_${newStatus}`,
    sendEmailNotification: true,
    emailSubject: `${title} — ${booking.bookingReference || jobTitle}`,
    emailDetails: [
      { label: 'Service Title', value: jobTitle },
      { label: 'Current Status', value: newStatus.replace(/_/g, ' ').toUpperCase() },
      { label: 'Reference', value: booking.bookingReference || 'Standard Job' }
    ]
  });
}

/**
 * Event D: Cancellation
 * Trigger: Customer, Vendor, or Admin cancels a job or booking
 * Recipients: Affected Customer and/or Vendor
 */
export async function notifyCancellation({
  customerId,
  vendorId = null,
  cancelledByUserId = null,
  jobTitle,
  resourceId,
  resourceType = 'job',
  reason = 'Cancelled by user'
}) {
  const results = [];

  // Customer notification:
  if (customerId) {
    const isCustomerActor = String(cancelledByUserId) === String(customerId);
    const custRes = await createNotification({
      recipientId: customerId,
      senderId: cancelledByUserId,
      type: 'cancellation',
      title: isCustomerActor ? 'Cancellation confirmed' : 'Booking cancelled',
      message: isCustomerActor
        ? `Your request "${jobTitle}" has been cancelled successfully.`
        : `Your service request "${jobTitle}" was cancelled: ${reason}.`,
      link: '/customer/my-jobs',
      relatedResource: {
        resourceType,
        resourceId
      },
      idempotencyKey: `cancel_${resourceType}_${resourceId}_cust`,
      sendEmailNotification: true,
      emailSubject: `Service Request Cancelled — "${jobTitle}"`,
      emailDetails: [
        { label: 'Service Title', value: jobTitle },
        { label: 'Cancellation Reason', value: reason || 'Requested by customer' },
        { label: 'Status', value: 'Cancelled' }
      ]
    });
    results.push(custRes);
  }

  // Vendor notification if an assigned contractor was affected:
  if (vendorId) {
    const vendRes = await createNotification({
      recipientId: vendorId,
      senderId: cancelledByUserId,
      type: 'cancellation',
      title: 'Booking cancelled',
      message: `The service assignment for "${jobTitle}" has been cancelled: ${reason}.`,
      link: '/vendor/browse-jobs',
      relatedResource: {
        resourceType,
        resourceId
      },
      idempotencyKey: `cancel_${resourceType}_${resourceId}_vend`,
      sendEmailNotification: true,
      emailSubject: `Assignment Cancelled — "${jobTitle}"`,
      emailDetails: [
        { label: 'Service Title', value: jobTitle },
        { label: 'Cancellation Reason', value: reason || 'Customer cancelled service request' },
        { label: 'Status', value: 'Cancelled' }
      ]
    });
    results.push(vendRes);
  }

  return results;
}

export const notificationService = {
  createNotification,
  notifyNewQuotation,
  notifyBookingConfirmed,
  notifyStatusChange,
  notifyCancellation
};

export default notificationService;

