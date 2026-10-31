import crypto from 'crypto';
import { msg91Service } from '../services/msg91.service.js';

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
 * Get all common database representations of a phone number for backwards-compatible querying
 */
export function getPhoneVariants(phone) {
  const normalized = normalizeIndianPhone(phone);
  if (!normalized) return [];
  return [
    normalized,
    `+91${normalized}`,
    `+91 ${normalized}`,
    `91${normalized}`,
    `0${normalized}`
  ];
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

  const provider = (process.env.SMS_PROVIDER || (process.env.FAST2SMS_API_KEY ? 'fast2sms' : (process.env.MSG91_AUTH_KEY ? 'msg91' : 'local'))).toLowerCase();
  const messageText = `Your WorkLogy verification code is ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;

  // 1. FAST2SMS Provider (India Quick OTP Route - No DLT or PE ID required)
  if (provider === 'fast2sms' && process.env.FAST2SMS_API_KEY) {
    const apiKey = process.env.FAST2SMS_API_KEY.trim();
    try {
      // Try Quick route first, or OTP route
      let response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'q',
          message: `Your WorkLogy verification code is ${otp}. Valid for 5 minutes.`,
          language: 'english',
          flash: 0,
          numbers: normalizedPhone
        })
      });

      let result = await response.json().catch(() => ({}));

      // If 'q' route requires different format, try 'otp' route
      if (!response.ok || result.return === false) {
        response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            route: 'otp',
            variables_values: String(otp),
            numbers: normalizedPhone
          })
        });
        result = await response.json().catch(() => ({}));
      }

      if (!response.ok || result.return === false) {
        const errorText = Array.isArray(result.message)
          ? result.message.join('. ')
          : (result.message || `Fast2SMS delivery failed with status ${response.status}`);
        throw new Error(errorText);
      }

      const reqId = Array.isArray(result.request_id)
        ? result.request_id[0]
        : (result.request_id || `f2s_${Date.now()}`);

      console.log(`[SMS Service] Real OTP successfully sent via Fast2SMS to +91 ******${normalizedPhone.slice(-4)} (reqId: ${reqId})`);

      return {
        success: true,
        provider: 'fast2sms',
        messageId: reqId
      };
    } catch (err) {
      console.error('[SMS Service] Fast2SMS Error:', err.message);
      throw new Error(`Fast2SMS delivery failed: ${err.message}`);
    }
  }

  // 2. MSG91 Official Provider (India DLT Approved Route)
  if (provider === 'msg91') {
    if (msg91Service.isConfigured()) {
      const msg91Res = await msg91Service.sendOtp({ phone: normalizedPhone });
      return {
        success: true,
        provider: 'msg91',
        messageId: msg91Res.message || `msg91_${Date.now()}`
      };
    } else if (process.env.NODE_ENV === 'production') {
      throw new Error('MSG91 configuration missing: MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID must be configured in backend environment');
    } else {
      console.warn('[SMS Service] MSG91 credentials not configured in development, falling back to safe local simulation');
    }
  }

  // 3. TWILIO Provider
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

  // 3. Fallback / Local Development Provider (masked diagnostic logging only)
  const simId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[SMS Service] Simulated dispatch for +91 ******${normalizedPhone.slice(-4)} (purpose: ${purpose}, id: ${simId})`);

  return {
    success: true,
    provider: 'local',
    messageId: simId
  };
}
