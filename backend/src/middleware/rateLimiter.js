import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 100000 : 5000, // Generous limit in development to support multiple client apps & live polling
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // In development or test, never throttle local client apps, emulators, or hot reloads
    if (isDev) return true;
    const ip = req.ip || req.connection?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1');
  },
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 100, // Higher limit for authentication attempts
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  }
});

