import crypto from 'crypto';

/**
 * Normalizes Indian mobile number to a canonical 10-digit string.
 * Strips +91, leading 0, spaces, and hyphens.
 */
export function normalizeIndianPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly.slice(2);
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return digitsOnly.slice(1);
  }
  if (digitsOnly.length === 10) {
    return digitsOnly;
  }
  return digitsOnly;
}

/**
 * Validate standard 10-digit Indian phone number
 */
export function isValidIndianPhone(phone) {
  const normalized = normalizeIndianPhone(phone);
  return /^[6-9]\d{9}$/.test(normalized);
}

/**
 * Hash raw token (such as refresh token) using SHA-256
 */
export function hashToken(token) {
  if (!token) return '';
  return crypto.createHash('sha256').update(String(token).trim()).digest('hex');
}

/**
 * Send OTP via configured SMS provider
 */
export async function sendOtpSms({ phone, otp, purpose = 'vendor_login' }) {
  const normalizedPhone = normalizeIndianPhone(phone);
  if (!isValidIndianPhone(normalizedPhone)) {
    throw new Error('Invalid 10-digit Indian mobile number');
  }

  const provider = (process.env.SMS_PROVIDER || 'mock').toLowerCase();
  const messageText = `Your WorkLogy verification code is ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;

  // 1. FAST2SMS Provider (India DLT / Quick OTP Route)
  if (provider === 'fast2sms' && process.env.FAST2SMS_API_KEY) {
    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otp,
          numbers: normalizedPhone
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.return === false) {
        throw new Error(result.message || `Fast2SMS delivery failed with status ${response.status}`);
      }

      return {
        success: true,
        provider: 'fast2sms',
        messageId: result.request_id || `f2s_${Date.now()}`
      };
    } catch (err) {
      console.error('[SMS Service] Fast2SMS Error:', err.message);
      throw new Error(`SMS delivery failed: ${err.message}`);
    }
  }

  // 2. TWILIO Provider
  if (provider === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', `+91${normalizedPhone}`);
      params.append('From', fromNumber);
      params.append('Body', messageText);

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.error_code) {
        throw new Error(result.message || `Twilio error ${result.error_code}`);
      }

      return {
        success: true,
        provider: 'twilio',
        messageId: result.sid || `tw_${Date.now()}`
      };
    } catch (err) {
      console.error('[SMS Service] Twilio Error:', err.message);
      throw new Error(`SMS delivery failed: ${err.message}`);
    }
  }

  // 3. Mock / Local Development Provider
  // Safely logs delivery in server console for development and local testing
  const simId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  console.log(`\n=================================================`);
  console.log(`📱 [SMS SERVICE - LOCAL/TEST MODE]`);
  console.log(`To: +91 ${normalizedPhone}`);
  console.log(`Purpose: ${purpose}`);
  console.log(`Code: [ ${otp} ] (Expires in 5 minutes)`);
  console.log(`Message: "${messageText}"`);
  console.log(`Simulated Message ID: ${simId}`);
  console.log(`=================================================\n`);

  return {
    success: true,
    provider: 'mock',
    messageId: simId,
    // In non-production, return debug code for automated tests
    ...(process.env.NODE_ENV !== 'production' ? { debugCode: otp } : {})
  };
}
