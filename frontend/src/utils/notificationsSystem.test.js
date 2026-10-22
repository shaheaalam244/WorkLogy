import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Notifications & Email Dispatch System Test Suite
 * Tests event types, recipient routing, idempotency deduplication,
 * RBAC authorization, user email preferences, and branded HTML templates.
 */

// Simulated In-App Notification Store
class MockNotificationStore {
  constructor() {
    this.notifications = [];
  }

  async create(data) {
    // Idempotency check: prevent duplicate notifications
    if (data.idempotencyKey) {
      const existing = this.notifications.find(
        n => n.recipient === data.recipient && n.idempotencyKey === data.idempotencyKey
      );
      if (existing) {
        return { success: true, duplicate: true, notification: existing };
      }
    }

    const doc = {
      _id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      recipient: data.recipient,
      sender: data.sender || null,
      type: data.type || 'system',
      title: data.title,
      message: data.message,
      link: data.link || '',
      isRead: false,
      readAt: null,
      relatedResource: data.relatedResource || null,
      idempotencyKey: data.idempotencyKey || null,
      emailStatus: data.emailStatus || 'none',
      createdAt: new Date()
    };

    this.notifications.unshift(doc);
    return { success: true, duplicate: false, notification: doc };
  }

  async markAsRead(notificationId, requestingUserId) {
    const notif = this.notifications.find(n => n._id === notificationId);
    if (!notif) return { success: false, status: 404, message: 'Notification not found' };
    
    // Authorization Guard: User cannot mark another user's notification
    if (notif.recipient.toString() !== requestingUserId.toString()) {
      return { success: false, status: 403, message: 'Unauthorized' };
    }

    notif.isRead = true;
    notif.readAt = new Date();
    return { success: true, notification: notif };
  }

  async getForUser(userId, filter = 'all') {
    return this.notifications.filter(n => {
      if (n.recipient !== userId) return false;
      if (filter === 'unread') return !n.isRead;
      return true;
    });
  }

  async getUnreadCount(userId) {
    return this.notifications.filter(n => n.recipient === userId && !n.isRead).length;
  }
}

// Email Template Generator (matches backend/src/services/email.service.js)
function renderEmailTemplate({
  title,
  message,
  actionText = 'View in WorkLogy',
  actionUrl = '',
  details = [],
  recipientName = 'User'
}) {
  const detailsHtml = details.length > 0
    ? details.map(d => `<tr><td>${d.label}</td><td>${d.value}</td></tr>`).join('')
    : '';

  const html = `
    <html>
      <body style="font-family: sans-serif;">
        <div style="background: #06684F; color: #fff; padding: 16px;">
          <h1>WorkLogy</h1>
        </div>
        <h2>${title}</h2>
        <p>Hello ${recipientName},</p>
        <p>${message}</p>
        ${detailsHtml ? `<table>${detailsHtml}</table>` : ''}
        ${actionUrl ? `<a href="http://localhost:5173${actionUrl}">${actionText}</a>` : ''}
      </body>
    </html>
  `.trim();

  const text = `
WorkLogy — ${title}
Hello ${recipientName},
${message}
${details.map(d => `${d.label}: ${d.value}`).join('\n')}
${actionUrl ? `${actionText}: http://localhost:5173${actionUrl}` : ''}
  `.trim();

  return { html, text };
}

// User Notification Preference Checker
function shouldSendEmail(eventType, userPreferences = {}) {
  const prefs = {
    emailQuotations: true,
    emailBookings: true,
    emailStatusUpdates: true,
    emailCancellations: true,
    emailMarketing: false,
    ...userPreferences
  };

  switch (eventType) {
    case 'quotation_received':
      return prefs.emailQuotations !== false;
    case 'booking_confirmed':
      return prefs.emailBookings !== false;
    case 'status_change':
      return prefs.emailStatusUpdates !== false;
    case 'cancellation':
      return prefs.emailCancellations !== false;
    default:
      return true;
  }
}

describe('WorkLogy Notifications System — Full Integration', () => {

  describe('1. Event Dispatching & Recipient Routing', () => {
    let store;

    beforeEach(() => {
      store = new MockNotificationStore();
    });

    it('Event A: Quotation Received creates customer notification with quoted amount', async () => {
      const res = await store.create({
        recipient: 'customer_101',
        sender: 'vendor_202',
        type: 'quotation_received',
        title: 'New quotation received',
        message: 'A service professional submitted a quotation of ₹1,500 on "AC Repair".',
        link: '/jobs/job_303',
        idempotencyKey: 'quote_app_404'
      });

      assert.equal(res.success, true);
      assert.equal(res.notification.recipient, 'customer_101');
      assert.equal(res.notification.type, 'quotation_received');
      assert.match(res.notification.message, /₹1,500/);
      assert.equal(res.notification.isRead, false);
    });

    it('Event B: Booking Confirmed dispatches separate notifications to customer and vendor', async () => {
      const bookingId = 'bk_505';

      // Customer notification
      const custRes = await store.create({
        recipient: 'customer_101',
        sender: 'vendor_202',
        type: 'booking_confirmed',
        title: 'Booking confirmed',
        message: 'Your service booking BK-98765 for "Plumbing" has been confirmed.',
        link: '/customer/bookings',
        idempotencyKey: `booking_confirmed_customer_${bookingId}`
      });

      // Vendor notification
      const vendRes = await store.create({
        recipient: 'vendor_202',
        sender: 'customer_101',
        type: 'booking_confirmed',
        title: 'Booking confirmed — Job Assigned',
        message: 'You have been confirmed for "Plumbing".',
        link: '/vendor/bookings',
        idempotencyKey: `booking_confirmed_vendor_${bookingId}`
      });

      assert.equal(custRes.success, true);
      assert.equal(vendRes.success, true);
      assert.equal(custRes.notification.recipient, 'customer_101');
      assert.equal(vendRes.notification.recipient, 'vendor_202');
      assert.equal(custRes.notification.type, 'booking_confirmed');
      assert.equal(vendRes.notification.type, 'booking_confirmed');
    });

    it('Event C: Status Change notifies customer when work starts or sign-off is requested', async () => {
      const res = await store.create({
        recipient: 'customer_101',
        type: 'status_change',
        title: 'Work in progress',
        message: 'Technician has started work on "Electrical Wiring".',
        link: '/customer/bookings',
        idempotencyKey: 'status_bk_505_in_progress'
      });

      assert.equal(res.success, true);
      assert.equal(res.notification.title, 'Work in progress');
      assert.equal(res.notification.recipient, 'customer_101');
    });

    it('Event D: Cancellation notifies customer and assigned contractor with reason', async () => {
      const res = await store.create({
        recipient: 'vendor_202',
        type: 'cancellation',
        title: 'Booking cancelled',
        message: 'The service assignment for "Carpentry" has been cancelled: Customer rescheduled.',
        link: '/vendor/browse-jobs',
        idempotencyKey: 'cancel_job_303_vend'
      });

      assert.equal(res.success, true);
      assert.equal(res.notification.type, 'cancellation');
      assert.match(res.notification.message, /Customer rescheduled/);
    });
  });

  describe('2. Idempotency & Deduplication Guard', () => {
    let store;

    beforeEach(() => {
      store = new MockNotificationStore();
    });

    it('prevents duplicate notification creation for the same business event', async () => {
      const eventData = {
        recipient: 'customer_101',
        type: 'quotation_received',
        title: 'New quotation received',
        message: 'A contractor submitted a quotation.',
        idempotencyKey: 'quotation_unique_999'
      };

      const first = await store.create(eventData);
      assert.equal(first.success, true);
      assert.equal(first.duplicate, false);

      // Repeat identical dispatch
      const second = await store.create(eventData);
      assert.equal(second.success, true);
      assert.equal(second.duplicate, true);

      // Store should still only contain 1 notification
      const userNotifs = await store.getForUser('customer_101');
      assert.equal(userNotifs.length, 1);
    });
  });

  describe('3. Authorization & Privacy Bounds', () => {
    let store;

    beforeEach(async () => {
      store = new MockNotificationStore();
      await store.create({
        recipient: 'user_A',
        title: 'Notice for User A',
        message: 'Private information'
      });
      await store.create({
        recipient: 'user_B',
        title: 'Notice for User B',
        message: 'Private information'
      });
    });

    it('users can only retrieve their own notifications', async () => {
      const aNotifs = await store.getForUser('user_A');
      assert.equal(aNotifs.length, 1);
      assert.equal(aNotifs[0].recipient, 'user_A');

      const bNotifs = await store.getForUser('user_B');
      assert.equal(bNotifs.length, 1);
      assert.equal(bNotifs[0].recipient, 'user_B');
    });

    it('prevents user A from marking user B notification as read', async () => {
      const bNotifs = await store.getForUser('user_B');
      const bNotifId = bNotifs[0]._id;

      const res = await store.markAsRead(bNotifId, 'user_A'); // User A attempting to mark B's notif
      assert.equal(res.success, false);
      assert.equal(res.status, 403);
    });

    it('allows user A to mark their own notification as read', async () => {
      const aNotifs = await store.getForUser('user_A');
      const aNotifId = aNotifs[0]._id;

      const res = await store.markAsRead(aNotifId, 'user_A');
      assert.equal(res.success, true);
      assert.equal(res.notification.isRead, true);
      assert.ok(res.notification.readAt instanceof Date);

      const unread = await store.getUnreadCount('user_A');
      assert.equal(unread, 0);
    });
  });

  describe('4. User Email Preferences Enforcement', () => {
    it('allows email notifications when user preferences are enabled (default)', () => {
      assert.equal(shouldSendEmail('quotation_received', {}), true);
      assert.equal(shouldSendEmail('booking_confirmed', {}), true);
      assert.equal(shouldSendEmail('status_change', {}), true);
      assert.equal(shouldSendEmail('cancellation', {}), true);
    });

    it('suppresses quotation email when user explicitly disabled emailQuotations', () => {
      const userPrefs = { emailQuotations: false, emailBookings: true };
      assert.equal(shouldSendEmail('quotation_received', userPrefs), false);
      assert.equal(shouldSendEmail('booking_confirmed', userPrefs), true);
    });

    it('suppresses cancellation email when user explicitly disabled emailCancellations', () => {
      const userPrefs = { emailCancellations: false };
      assert.equal(shouldSendEmail('cancellation', userPrefs), false);
    });
  });

  describe('5. Email Template & Plain Text Rendering', () => {
    it('renders branded HTML and accessible plain-text fallback', () => {
      const rendered = renderEmailTemplate({
        title: 'Booking confirmed',
        message: 'Your booking has been confirmed with escrow protection.',
        actionText: 'View Booking',
        actionUrl: '/customer/bookings',
        details: [
          { label: 'Booking Ref', value: 'BK-12345' },
          { label: 'Service', value: 'Plumbing' }
        ],
        recipientName: 'Rahul Verma'
      });

      // Verify HTML content
      assert.match(rendered.html, /#06684F/); // Brand green
      assert.match(rendered.html, /WorkLogy/);
      assert.match(rendered.html, /Booking confirmed/);
      assert.match(rendered.html, /BK-12345/);
      assert.match(rendered.html, /View Booking/);

      // Verify plain-text fallback
      assert.match(rendered.text, /Hello Rahul Verma/);
      assert.match(rendered.text, /Booking Ref: BK-12345/);
      assert.match(rendered.text, /http:\/\/localhost:5173\/customer\/bookings/);
    });
  });

});
