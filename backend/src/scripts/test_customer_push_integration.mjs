import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import {
  createNotification,
  notifyNewQuotation,
  notifyBookingConfirmed,
  notifyStatusChange,
  notifyCancellation,
  notifyPaymentUpdate
} from '../services/notification.service.js';
import {
  registerPushTokenForUser,
  deregisterPushTokenForUser,
  sendPushNotification
} from '../services/pushNotification.service.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://shaheaalam041_db_user:4SalgmfWxigppXIc@cluster0.6rujmnz.mongodb.net/test?retryWrites=true&w=majority';
const JWT_SECRET = process.env.JWT_SECRET || 'worklogy_super_secret_jwt_key_2026_secure';
const API_BASE = 'http://localhost:5001/api';

console.log('================================================================');
console.log('WorkLogy: Customer Push Notification System Comprehensive Tests');
console.log('================================================================\n');

await mongoose.connect(MONGO_URI);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

// Find customer
const customer = await User.findOne({ email: 'aalam@gmail.com' });
if (!customer) {
  console.error('Customer aalam@gmail.com not found');
  process.exit(1);
}

const customerJwt = jwt.sign({ id: customer._id.toString(), role: customer.role }, JWT_SECRET, { expiresIn: '1h' });

const TEST_CUSTOMER_TOKEN_1 = 'ExponentPushToken[TestCustomerPixelDevice01]';
const TEST_CUSTOMER_TOKEN_2 = 'ExponentPushToken[TestCustomerTabletDevice02]';
const TEST_DEVICE_ID_1 = 'device-android-pixel-test-01';
const TEST_DEVICE_ID_2 = 'device-android-tablet-test-02';

try {
  // ─────────────────────────────────────────────────────────────
  // TEST 1: Register Push Token via API Endpoint
  // ─────────────────────────────────────────────────────────────
  console.log('--- Test 1: Register Push Token via API (POST /api/notifications/push-token) ---');
  const regRes = await fetch(`${API_BASE}/notifications/push-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerJwt}`
    },
    body: JSON.stringify({
      token: TEST_CUSTOMER_TOKEN_1,
      platform: 'android',
      deviceId: TEST_DEVICE_ID_1,
      deviceModel: 'Google Pixel 8 Pro',
      appVersion: '1.0.0'
    })
  });
  const regData = await regRes.json();
  assert(regRes.status === 200 && regData.success === true, 'Push token successfully registered via API');

  // Verify in MongoDB
  const customerInDb = await User.findById(customer._id);
  const activeToken = customerInDb.pushTokens.find((t) => t.token === TEST_CUSTOMER_TOKEN_1);
  assert(activeToken && activeToken.isActive === true, 'Token verified in MongoDB with isActive=true');
  assert(activeToken.platform === 'android' && activeToken.deviceId === TEST_DEVICE_ID_1, 'Device metadata correctly saved');

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Multi-device Token Support
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 2: Multi-Device Registration Support ---');
  await fetch(`${API_BASE}/notifications/push-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerJwt}`
    },
    body: JSON.stringify({
      token: TEST_CUSTOMER_TOKEN_2,
      platform: 'android',
      deviceId: TEST_DEVICE_ID_2,
      deviceModel: 'Samsung Galaxy Tab S9',
      appVersion: '1.0.0'
    })
  });

  const updatedCustomer = await User.findById(customer._id);
  const tokens = updatedCustomer.pushTokens.filter((t) => t.isActive);
  assert(tokens.length >= 2, `Multiple active device tokens supported (found ${tokens.length})`);

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Test Push Dispatch via API (POST /api/notifications/test-push)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 3: Test Push Dispatch Endpoint ---');
  const testPushRes = await fetch(`${API_BASE}/notifications/test-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerJwt}`
    },
    body: JSON.stringify({
      title: 'Customer Test Notification',
      body: 'WorkLogy Customer App push notification delivery verification.'
    })
  });
  const testPushData = await testPushRes.json();
  assert(testPushRes.status === 200 && testPushData.success === true, 'Test push endpoint dispatches successfully');
  assert(testPushData.totalAttempted >= 2, `Dispatched to all active customer devices (${testPushData.totalAttempted} attempted)`);

  // ─────────────────────────────────────────────────────────────
  // TEST 4: Customer Notification Events & Channel Mapping
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 4: Customer Notification Events & Android Channel Mapping ---');

  // Event A: Service Request Created
  const reqRes = await createNotification({
    recipientId: customer._id,
    type: 'job_alert',
    title: 'Service Request Created',
    message: 'Your plumbing service request has been published.',
    link: '/customer/bookings',
    sendPush: true
  });
  const reqNotif = reqRes.notification;
  assert(reqNotif?._id && reqNotif.title === 'Service Request Created', 'Event A: Service Request notification created in MongoDB');

  // Event B: Quotation Received
  const quoteRes = await notifyNewQuotation({
    customerId: customer._id,
    vendorId: new mongoose.Types.ObjectId(),
    job: { _id: new mongoose.Types.ObjectId(), title: 'Electrical Repair' },
    proposedAmount: 750
  });
  const quoteNotif = quoteRes.notification;
  assert(quoteNotif?._id && quoteNotif.type === 'quotation_received', 'Event B: Quotation Received notification created in MongoDB');

  // Event C: Booking Confirmed
  const dummyBookingId = new mongoose.Types.ObjectId();
  const bookingResults = await notifyBookingConfirmed({
    customerId: customer._id,
    vendorId: new mongoose.Types.ObjectId(),
    booking: { _id: dummyBookingId, bookingReference: 'BK-TEST99', timeSlot: '10:00 AM' },
    jobTitle: 'Home Cleaning'
  });
  const customerBookingNotif = bookingResults.map(r => r?.notification).find(n => n && String(n.recipient) === String(customer._id));
  assert(customerBookingNotif && customerBookingNotif.type === 'booking_confirmed', 'Event C: Booking Confirmation notification created');

  // Event D: Status Change
  const statusRes = await notifyStatusChange({
    recipientId: customer._id,
    booking: { _id: dummyBookingId, bookingReference: 'BK-TEST99' },
    jobTitle: 'Home Cleaning',
    newStatus: 'in_progress'
  });
  const statusNotif = statusRes.notification;
  assert(statusNotif?._id && statusNotif.type === 'status_change', 'Event D: Status Change notification created');

  // Event E: Cancellation
  const cancelResults = await notifyCancellation({
    customerId: customer._id,
    vendorId: new mongoose.Types.ObjectId(),
    cancelledByUserId: customer._id,
    jobTitle: 'Home Cleaning',
    resourceId: dummyBookingId,
    reason: 'Customer rescheduled'
  });
  const customerCancelNotif = cancelResults.map(r => r?.notification).find(n => n && String(n.recipient) === String(customer._id));
  assert(customerCancelNotif && customerCancelNotif.type === 'cancellation', 'Event E: Cancellation notification created');

  // Event F: Chat Message
  const chatRes = await createNotification({
    recipientId: customer._id,
    type: 'message',
    title: 'New message from Ramesh',
    message: 'I will arrive at 10:30 AM.',
    link: '/customer/messages',
    relatedResource: {
      resourceType: 'chat',
      resourceId: new mongoose.Types.ObjectId()
    },
    sendPush: true
  });
  const chatNotif = chatRes.notification;
  assert(chatNotif?._id && chatNotif.type === 'message', 'Event F: Chat message notification created');

  // Event G: Payment Confirmed & Refund
  const payResults = await notifyPaymentUpdate({
    customerId: customer._id,
    amount: 1500,
    transactionId: new mongoose.Types.ObjectId(),
    jobTitle: 'Home Cleaning',
    type: 'payment',
    status: 'confirmed'
  });
  const payNotif = payResults[0]?.notification;
  assert(payNotif && payNotif.type === 'payment', 'Event G: Payment notification created');

  // ─────────────────────────────────────────────────────────────
  // TEST 5: Idempotency / Duplicate Prevention
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 5: Idempotency & Duplicate Prevention ---');
  const duplicateTestKey = `test_idem_key_${Date.now()}`;
  const firstDispatch = await createNotification({
    recipientId: customer._id,
    type: 'job_alert',
    title: 'Idempotent Alert',
    message: 'This alert should only be created once.',
    idempotencyKey: duplicateTestKey
  });
  const secondDispatch = await createNotification({
    recipientId: customer._id,
    type: 'job_alert',
    title: 'Idempotent Alert',
    message: 'This alert should only be created once.',
    idempotencyKey: duplicateTestKey
  });
  assert(firstDispatch.notification?._id && secondDispatch.duplicate === true, 'Duplicate notification intercepted and suppressed by idempotency key');

  // ─────────────────────────────────────────────────────────────
  // TEST 6: Unread Count & Mark as Read
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 6: In-App Notification Center APIs ---');
  const countRes = await fetch(`${API_BASE}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${customerJwt}` }
  });
  const countData = await countRes.json();
  assert(countRes.status === 200 && countData.unreadCount > 0, `Unread count API returns accurate count (${countData.unreadCount})`);

  // Mark single as read
  const markReadRes = await fetch(`${API_BASE}/notifications/${reqNotif._id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${customerJwt}` }
  });
  const markReadData = await markReadRes.json();
  assert(markReadRes.status === 200 && markReadData.success === true, 'Mark single notification as read succeeds');

  const verifiedReadDoc = await Notification.findById(reqNotif._id);
  assert(verifiedReadDoc.isRead === true && verifiedReadDoc.readAt !== null, 'isRead and readAt persist in MongoDB');

  // ─────────────────────────────────────────────────────────────
  // TEST 7: Push Token Deregistration on Logout
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 7: Push Token Deregistration on Logout ---');
  const deregRes = await fetch(`${API_BASE}/notifications/push-token`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerJwt}`
    },
    body: JSON.stringify({
      token: TEST_CUSTOMER_TOKEN_1,
      deviceId: TEST_DEVICE_ID_1
    })
  });
  const deregData = await deregRes.json();
  assert(deregRes.status === 200 && deregData.success === true, 'Token deregistration API succeeds on logout');

  const customerAfterLogout = await User.findById(customer._id);
  const deregToken = customerAfterLogout.pushTokens.find((t) => t.token === TEST_CUSTOMER_TOKEN_1);
  assert(deregToken && deregToken.isActive === false, 'Deregistered token is set to isActive=false in MongoDB');

  // Clean up test notifications & push tokens
  console.log('\n--- Cleaning up test records ---');
  await Notification.deleteMany({
    recipient: customer._id,
    $or: [
      { title: 'Service Request Created' },
      { type: 'quotation_received' },
      { type: 'booking_confirmed' },
      { type: 'status_change' },
      { type: 'cancellation' },
      { type: 'message' },
      { type: 'payment' },
      { title: 'Idempotent Alert' }
    ]
  });

  await User.findByIdAndUpdate(customer._id, {
    $pull: {
      pushTokens: {
        token: { $in: [TEST_CUSTOMER_TOKEN_1, TEST_CUSTOMER_TOKEN_2] }
      }
    }
  });

  console.log('Cleanup completed cleanly.\n');

  console.log('================================================================');
  console.log(`E2E Push Notification Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
} catch (err) {
  console.error('Test execution error:', err);
  process.exit(1);
} finally {
  await mongoose.disconnect();
}
