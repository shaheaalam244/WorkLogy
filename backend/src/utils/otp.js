import crypto from 'crypto';

const PEPPER = process.env.JWT_SECRET || 'worklogy_super_secret_jwt_key_2026_secure';
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(PEPPER).digest(); // 32 bytes

/**
 * Hash a 6-digit OTP using SHA-256 + HMAC/pepper
 */
export const hashOtp = (otp) => {
  if (!otp) return '';
  return crypto
    .createHmac('sha256', PEPPER)
    .update(String(otp).trim())
    .digest('hex');
};

/**
 * Encrypt OTP symmetrically for customer-only retrieval
 */
export const encryptCustomerOtp = (otp) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(String(otp), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt customer OTP
 */
export const decryptCustomerOtp = (encryptedPayload) => {
  if (!encryptedPayload || !encryptedPayload.includes(':')) return null;
  try {
    const [ivHex, encryptedData] = encryptedPayload.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt customer OTP:', err);
    return null;
  }
};

/**
 * Generate a cryptographically secure 6-digit OTP
 */
export const generateSecureOtp = () => {
  const otpNumber = crypto.randomInt(100000, 1000000);
  const otp = otpNumber.toString();
  const codeHash = hashOtp(otp);
  const customerEncryptedOtp = encryptCustomerOtp(otp);

  return {
    otp,
    codeHash,
    customerEncryptedOtp
  };
};

/**
 * Compare submitted OTP with stored hash
 */
export const verifyOtpMatch = (submittedOtp, storedHash) => {
  if (!submittedOtp || !storedHash) return false;
  const computedHash = hashOtp(submittedOtp);
  try {
    return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(storedHash));
  } catch {
    return computedHash === storedHash;
  }
};
