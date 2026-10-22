/**
 * WorkLogy Email Notification Service
 * Renders branded responsive HTML templates with plain-text fallbacks.
 * Handles SMTP delivery when configured, or safe outbox recording when credentials are pending.
 */

// Delivery log for operational audit
const deliveryLogs = [];

/**
 * Generate WorkLogy branded responsive HTML email template
 */
export function renderEmailTemplate({
  title,
  preheader = '',
  message,
  actionText = 'View in WorkLogy',
  actionUrl,
  details = [],
  recipientName = 'Valued User'
}) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const fullActionUrl = actionUrl?.startsWith('http') ? actionUrl : `${frontendUrl}${actionUrl || ''}`;

  const detailsHtml = details.length > 0
    ? `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0;">
        ${details
          .map(
            (d) => `
          <tr>
            <td style="padding: 10px 14px; font-size: 13px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">${d.label}</td>
            <td style="padding: 10px 14px; font-size: 13px; color: #0F172A; font-weight: bold; border-bottom: 1px solid #E2E8F0; text-align: right;">${d.value}</td>
          </tr>`
          )
          .join('')}
      </table>`
    : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F1F5F9; margin: 0; padding: 24px; color: #1E293B; }
    .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #E2E8F0; }
    .header { background: #06684F; padding: 24px 32px; text-align: left; }
    .logo { color: #FFFFFF; font-size: 20px; font-weight: 800; text-decoration: none; letter-spacing: -0.5px; }
    .content { padding: 32px; }
    .title { font-size: 20px; font-weight: 800; color: #0F172A; margin: 0 0 12px 0; line-height: 1.3; }
    .message { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0; }
    .button-container { margin: 28px 0; text-align: left; }
    .btn { display: inline-block; background: #06684F; color: #FFFFFF !important; font-size: 14px; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 10px; }
    .footer { background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 32px; font-size: 12px; color: #94A3B8; line-height: 1.5; }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">${preheader || message}</div>
  <div class="container">
    <div class="header">
      <div class="logo">WorkLogy</div>
    </div>
    <div class="content">
      <h1 class="title">${title}</h1>
      <p class="message">Hello ${recipientName},</p>
      <p class="message">${message}</p>
      ${detailsHtml}
      ${actionUrl ? `
      <div class="button-container">
        <a href="${fullActionUrl}" class="btn">${actionText} &rarr;</a>
      </div>` : ''}
    </div>
    <div class="footer">
      This is an automated notification regarding your WorkLogy service activity in Lucknow. You can manage your email alerts in your <a href="${frontendUrl}/customer/notifications" style="color: #06684F; text-decoration: underline;">Notification Center</a>.
    </div>
  </div>
</body>
</html>
  `.trim();

  // Plain-text fallback for accessibility and non-HTML mail clients
  const text = `
WorkLogy — ${title}
Hello ${recipientName},

${message}

${details.map(d => `${d.label}: ${d.value}`).join('\n')}

${actionUrl ? `${actionText}: ${fullActionUrl}` : ''}

Manage notification settings at: ${frontendUrl}/customer/notifications
  `.trim();

  return { html, text };
}

/**
 * Send an email notification with safe outbox fallback and retry
 */
export async function sendEmail({
  to,
  recipientName = 'Valued Customer',
  subject,
  title,
  message,
  actionText = 'View in WorkLogy',
  actionUrl,
  details = [],
  idempotencyKey = null
}) {
  if (!to || !to.includes('@')) {
    return { success: false, status: 'invalid_recipient', error: 'Invalid recipient email' };
  }

  const { html, text } = renderEmailTemplate({
    title: title || subject,
    message,
    actionText,
    actionUrl,
    details,
    recipientName
  });

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const from = process.env.EMAIL_FROM || 'WorkLogy <notifications@worklogy.in>';

  const hasCredentials = Boolean(smtpHost && smtpUser && smtpPass);

  // Record delivery attempt safely without exposing credentials
  const logRecord = {
    id: `email_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    to: to.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask recipient email in audit logs
    subject,
    status: hasCredentials ? 'queued' : 'pending_smtp_credentials',
    idempotencyKey,
    timestamp: new Date()
  };

  if (!hasCredentials) {
    // Safe outbox record when SMTP credentials are not yet configured in environment
    logRecord.status = 'pending_smtp_credentials';
    logRecord.note = 'SMTP_HOST/SMTP_USER not configured in environment. Recorded in outbox log.';
    deliveryLogs.unshift(logRecord);
    if (deliveryLogs.length > 100) deliveryLogs.pop();

    return {
      success: true,
      status: 'pending_smtp_credentials',
      outbox: true,
      messageId: logRecord.id,
      note: logRecord.note
    };
  }

  // If credentials exist, execute delivery with bounded retry
  let attempts = 0;
  const maxAttempts = 3;
  let lastError = null;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      // Dynamic import of nodemailer if installed
      const nodemailer = await import('nodemailer').catch(() => null);
      if (!nodemailer || !nodemailer.createTransport) {
        throw new Error('Nodemailer package is not installed');
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html
      });

      logRecord.status = 'sent';
      logRecord.messageId = info.messageId;
      deliveryLogs.unshift(logRecord);
      if (deliveryLogs.length > 100) deliveryLogs.pop();

      return {
        success: true,
        status: 'sent',
        messageId: info.messageId
      };
    } catch (err) {
      lastError = err;
      // Exponential backoff between retries (100ms, 200ms)
      if (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, attempts * 100));
      }
    }
  }

  logRecord.status = 'failed';
  logRecord.error = lastError?.message || 'SMTP delivery failed';
  deliveryLogs.unshift(logRecord);
  if (deliveryLogs.length > 100) deliveryLogs.pop();

  return {
    success: false,
    status: 'failed',
    error: lastError?.message || 'SMTP delivery failed after 3 attempts'
  };
}

/**
 * Retrieve operational delivery logs for admin inspection
 */
export function getEmailDeliveryLogs() {
  return [...deliveryLogs];
}
