import { normalizeIndianPhone, isValidIndianPhone } from '../utils/sms.js';

const MSG91_BASE_URL = 'https://control.msg91.com/api/v5';

/**
 * MSG91 Official OTP & SMS Integration Service
 * Complies with MSG91 v5 OTP API and Indian DLT requirements.
 *
 * Official documentation:
 * - OTP API: https://docs.msg91.com/otp
 * - OTP Widget: https://docs.msg91.com/otp-widget
 */
class Msg91Service {
  /**
   * Check if MSG91 required credentials are configured in backend environment
   */
  isConfigured() {
    const authKey = (process.env.MSG91_AUTH_KEY || '').trim();
    const templateId = (process.env.MSG91_OTP_TEMPLATE_ID || '').trim();
    const widgetId = (process.env.MSG91_WIDGET_ID || '').trim();
    const tokenAuth = (process.env.MSG91_TOKEN_AUTH || '').trim();
    return Boolean((widgetId && tokenAuth) || (authKey && templateId));
  }

  /**
   * Normalize phone number with 91 country code prefix (e.g. 919876543210)
   */
  formatMobile(phone) {
    const normalized = normalizeIndianPhone(phone);
    if (!isValidIndianPhone(normalized)) {
      throw new Error('Please enter a valid 10-digit Indian mobile number');
    }
    return `91${normalized}`;
  }

  /**
   * Send real OTP via MSG91 OTP Widget or REST API
   *
   * @param {Object} options
   * @param {string} options.phone - 10-digit Indian phone number
   * @param {string} [options.templateId] - Optional template override
   * @param {string} [options.otp] - Optional pre-generated 6-digit OTP
   * @returns {Promise<{ success: boolean, message: string, type: string, requestId?: string, provider: string }>}
   */
  async sendOtp({ phone, templateId, otp, dltTeId, senderId }) {
    const widgetId = (process.env.MSG91_WIDGET_ID || '').trim();
    const tokenAuth = (process.env.MSG91_TOKEN_AUTH || '').trim();
    const authKey = (process.env.MSG91_AUTH_KEY || '').trim();
    const activeTemplateId = (templateId || process.env.MSG91_OTP_TEMPLATE_ID || '').trim();
    const activeDltTeId = (dltTeId || process.env.MSG91_DLT_TE_ID || '').trim();
    const activeSenderId = (senderId || process.env.MSG91_SENDER_ID || '').trim();

    const mobileWithCountry = this.formatMobile(phone);

    // If authKey and activeTemplateId are available, use official MSG91 REST OTP API (supports explicit OTP and India DLT)
    if (authKey && activeTemplateId) {
      const params = {
        template_id: activeTemplateId,
        mobile: mobileWithCountry,
        otp_length: '6',
        otp_expiry: '5' // Valid for 5 minutes
      };

      if (otp) {
        params.otp = String(otp);
      }

      if (activeDltTeId) {
        params.dlt_te_id = activeDltTeId;
      }

      if (activeSenderId) {
        params.sender = activeSenderId;
      }

      const queryParams = new URLSearchParams(params);
      const url = `${MSG91_BASE_URL}/otp?${queryParams.toString()}`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            authkey: authKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.type === 'error') {
          const errorMsg = data.message || `MSG91 OTP dispatch failed with HTTP ${response.status}`;
          console.error('[MSG91 Service] REST Send OTP Error:', errorMsg);
          // Fall through to widget route below if available
          if (!widgetId || !tokenAuth) {
            throw new Error(`MSG91 Error: ${errorMsg}`);
          }
        } else {
          const reqId = data.request_id || data.message || '';
          console.log(`[MSG91 Service] OTP request accepted by MSG91 REST API for +91 ******${phone.slice(-4)} (reqId: ${reqId})`);
          return {
            success: true,
            message: data.message || 'OTP request accepted',
            requestId: reqId,
            type: 'success',
            provider: 'msg91'
          };
        }
      } catch (restErr) {
        console.warn('[MSG91 Service] REST route notice, falling back to Widget:', restErr.message);
        if (!widgetId || !tokenAuth) throw restErr;
      }
    }

    // Secondary: MSG91 OTP Widget API (Pre-approved multi-channel delivery)
    if (widgetId && tokenAuth) {
      try {
        const response = await fetch('https://api.msg91.com/api/v5/widget/sendOtp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            widgetId,
            tokenAuth,
            identifier: mobileWithCountry
          })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.type === 'error' || data.status === 'fail') {
          const errorMsg = data.message || `MSG91 Widget OTP dispatch failed with HTTP ${response.status}`;
          console.error('[MSG91 Service] Widget Send OTP Error:', errorMsg);
          throw new Error(`MSG91 Error: ${errorMsg}`);
        } else {
          const reqId = data.message || '';
          console.log(`[MSG91 Service] OTP request accepted by MSG91 Widget for +91 ******${phone.slice(-4)} (reqId: ${reqId})`);
          return {
            success: true,
            message: 'OTP request accepted',
            requestId: reqId,
            type: 'success',
            provider: 'msg91_widget'
          };
        }
      } catch (widgetErr) {
        throw widgetErr;
      }
    }

    throw new Error('MSG91 configuration missing: MSG91_AUTH_KEY or MSG91_TOKEN_AUTH must be set');
  }

  /**
   * Retrieve live OTP delivery status from MSG91
   * Queries official OTP log reports to determine true delivery state:
   * REQUEST_ACCEPTED | DELIVERY_PENDING | DELIVERED | DELIVERY_FAILED | REJECTED | PROVIDER_ERROR
   *
   * @param {Object} options
   * @param {string} options.requestId - Provider request ID
   * @param {string} [options.phone] - Optional phone number to correlate
   * @returns {Promise<{
   *   success: boolean,
   *   deliveryStatus: 'REQUEST_ACCEPTED' | 'DELIVERY_PENDING' | 'DELIVERED' | 'DELIVERY_FAILED' | 'REJECTED' | 'PROVIDER_ERROR',
   *   details: Object
   * }>}
   */
  async getDeliveryStatus({ requestId, phone }) {
    const authKey = (process.env.MSG91_AUTH_KEY || '').trim();

    if (!authKey) {
      return {
        success: false,
        deliveryStatus: 'PROVIDER_ERROR',
        details: { message: 'MSG91_AUTH_KEY is not configured' }
      };
    }

    if (!requestId) {
      return {
        success: false,
        deliveryStatus: 'DELIVERY_PENDING',
        details: { message: 'No requestId provided yet' }
      };
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const url = `${MSG91_BASE_URL}/report/logs/p/otp?startDate=${today}&endDate=${today}&requestId=${encodeURIComponent(requestId)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { authkey: authKey }
      });

      if (!response.ok) {
        return {
          success: false,
          deliveryStatus: 'PROVIDER_ERROR',
          details: { httpStatus: response.status, message: 'Failed to fetch MSG91 delivery report' }
        };
      }

      const body = await response.json().catch(() => ({}));
      const records = Array.isArray(body?.data) ? body.data : [];
      const item = records.find(r => r.requestId === requestId) || records[0];

      if (!item) {
        return {
          success: true,
          deliveryStatus: 'REQUEST_ACCEPTED',
          details: { message: 'Message request accepted by provider, indexing in progress' }
        };
      }

      // Check for DLT pauses or fatal gateway halts
      const pauseReason = String(item.pauseReason || '').trim();
      const rawStatus = String(item.status || '').trim();
      const failureReason = String(item.failureReason || '').trim();

      let deliveryStatus = 'DELIVERY_PENDING';
      let diagnosticMessage = '';

      if (pauseReason) {
        // Pause reason like "code: 211" => DLT Template ID Missing
        deliveryStatus = 'REJECTED';
        if (pauseReason.includes('211')) {
          diagnosticMessage = 'Paused: DLT Template ID Missing (code: 211). Map registered 19-digit DLT Template ID in MSG91 dashboard.';
        } else {
          diagnosticMessage = `Paused by MSG91: ${pauseReason}`;
        }
      } else if (rawStatus.toLowerCase() === 'delivered') {
        deliveryStatus = 'DELIVERED';
        diagnosticMessage = 'SMS successfully delivered to recipient handset';
      } else if (rawStatus.toLowerCase() === 'failed' || failureReason) {
        deliveryStatus = 'DELIVERY_FAILED';
        diagnosticMessage = failureReason || 'Operator delivery failed';
      } else if (rawStatus.toLowerCase() === 'pending') {
        deliveryStatus = 'DELIVERY_PENDING';
        diagnosticMessage = 'Message in carrier transit queue';
      }

      return {
        success: true,
        deliveryStatus,
        details: {
          requestId: item.requestId,
          rawStatus: item.status,
          pauseReason: item.pauseReason || null,
          failureReason: item.failureReason || null,
          deliveryTime: item.deliveryTime || null,
          dltTeId: item.DLT_TE_ID || null,
          senderId: item.senderId || null,
          telecomCircle: item.telecomCircle || null,
          diagnosticMessage
        }
      };
    } catch (err) {
      console.error('[MSG91 Service] getDeliveryStatus exception:', err.message);
      return {
        success: false,
        deliveryStatus: 'PROVIDER_ERROR',
        details: { error: err.message }
      };
    }
  }

  /**
   * Verify OTP with MSG91 servers
   *
   * @param {Object} options
   * @param {string} options.phone - 10-digit Indian phone number
   * @param {string} options.otp - 4 to 6-digit verification code
   * @param {string} [options.reqId] - Request ID from Send OTP response
   * @param {string} [options.provider] - 'msg91' or 'msg91_widget'
   * @returns {Promise<{ success: boolean, message: string, accessToken?: string }>}
   */
  async verifyOtp({ phone, otp, reqId, provider }) {
    const widgetId = (process.env.MSG91_WIDGET_ID || '').trim();
    const tokenAuth = (process.env.MSG91_TOKEN_AUTH || '').trim();
    const authKey = (process.env.MSG91_AUTH_KEY || '').trim();

    const mobileWithCountry = this.formatMobile(phone);
    const cleanOtp = String(otp || '').trim();

    if (!/^\d{4,6}$/.test(cleanOtp)) {
      return {
        success: false,
        message: 'Please enter a valid verification code'
      };
    }

    // 1. If provider was REST SendOTP ('msg91') or authKey is present, verify via REST API:
    if (authKey && (!provider || provider === 'msg91')) {
      try {
        const queryParams = new URLSearchParams({
          otp: cleanOtp,
          mobile: mobileWithCountry
        });

        const url = `${MSG91_BASE_URL}/otp/verify?${queryParams.toString()}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: { authkey: authKey }
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.type !== 'error') {
          return {
            success: true,
            message: data.message || 'OTP verified successfully'
          };
        }
      } catch (restErr) {
        console.warn('[MSG91 Service] REST verify exception:', restErr.message);
      }
    }

    // 2. Try Widget verify endpoint if configured and reqId is available:
    if (widgetId && tokenAuth && reqId) {
      try {
        const response = await fetch('https://api.msg91.com/api/v5/widget/verifyOtp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            widgetId,
            tokenAuth,
            reqId,
            identifier: mobileWithCountry,
            otp: cleanOtp
          })
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && (data.type === 'success' || data.message === 'OTP verified success' || data['access-token'])) {
          return {
            success: true,
            message: 'OTP verified successfully',
            accessToken: data['access-token']
          };
        }
      } catch (widgetVerifyErr) {
        console.warn('[MSG91 Service] Widget verify notice:', widgetVerifyErr.message);
      }
    }

    // 3. Fallback: try REST verify if not attempted in step 1
    if (authKey && provider === 'msg91_widget') {
      try {
        const queryParams = new URLSearchParams({
          otp: cleanOtp,
          mobile: mobileWithCountry
        });
        const url = `${MSG91_BASE_URL}/otp/verify?${queryParams.toString()}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: { authkey: authKey }
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.type !== 'error') {
          return {
            success: true,
            message: data.message || 'OTP verified successfully'
          };
        }
      } catch (e) {}
    }

    return {
      success: false,
      message: 'Incorrect verification code. Please check your SMS and try again.'
    };
  }

  /**
   * Retry/Resend OTP via MSG91
   * GET https://control.msg91.com/api/v5/otp/retry?authkey=...&retrytype=text&mobile=91...
   *
   * @param {Object} options
   * @param {string} options.phone - 10-digit Indian phone number
   * @param {'text'|'voice'} [options.retryType='text'] - Retry communication channel
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async retryOtp({ phone, retryType = 'text' }) {
    const authKey = (process.env.MSG91_AUTH_KEY || '').trim();

    if (!authKey) {
      throw new Error('MSG91 configuration missing: MSG91_AUTH_KEY must be set in backend environment');
    }

    const mobileWithCountry = this.formatMobile(phone);

    const queryParams = new URLSearchParams({
      authkey: authKey,
      retrytype: retryType,
      mobile: mobileWithCountry
    });

    const url = `${MSG91_BASE_URL}/otp/retry?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          authkey: authKey
        }
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.type === 'error') {
        return {
          success: false,
          message: data.message || 'Failed to resend OTP'
        };
      }

      return {
        success: true,
        message: data.message || 'OTP resent successfully'
      };
    } catch (err) {
      console.error('[MSG91 Service] Retry Exception:', err.message);
      throw err;
    }
  }

  /**
   * Validate MSG91 OTP Widget JWT Access Token on server side
   * POST https://control.msg91.com/api/v5/widget/verifyAccessToken
   *
   * @param {Object} options
   * @param {string} options.accessToken - JWT token returned by MSG91 client widget
   * @returns {Promise<{ success: boolean, identifier: string }>}
   */
  async verifyAccessToken({ accessToken }) {
    const authKey = (process.env.MSG91_AUTH_KEY || '').trim();

    if (!authKey) {
      throw new Error('MSG91 configuration missing: MSG91_AUTH_KEY must be set in backend environment');
    }

    if (!accessToken) {
      throw new Error('Access token is required for verification');
    }

    const url = `${MSG91_BASE_URL}/widget/verifyAccessToken`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          authkey: authKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          'access-token': accessToken
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.type === 'error') {
        throw new Error(data.message || 'Invalid or expired MSG91 verification token');
      }

      const rawIdentifier = data.data?.identifier || data.identifier || '';
      const normalized = normalizeIndianPhone(rawIdentifier);

      return {
        success: true,
        identifier: normalized,
        raw: data
      };
    } catch (err) {
      console.error('[MSG91 Service] Access Token Verification Error:', err.message);
      throw err;
    }
  }
}

export const msg91Service = new Msg91Service();
