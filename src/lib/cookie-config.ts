/**
 * Cookie Configuration Helper
 * Ensures consistent cookie options across login, logout, and middleware
 * 
 * CRITICAL: All cookie operations MUST use this helper to prevent
 * subsequent logout failures due to configuration mismatches
 */

export interface CookieConfig {
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  domain?: string;
  maxAge?: number;
}

/**
 * Get standardized cookie configuration for authentication
 * This MUST be used by login, logout, and middleware to ensure consistency
 */
export function getAuthCookieConfig(options: {
  includeMaxAge?: boolean;
  forDeletion?: boolean;
} = {}): CookieConfig {
  const isProd = process.env.NODE_ENV === 'production';
  
  const config: CookieConfig = {
    path: '/',
    httpOnly: true,
    secure: isProd, // HTTPS only in production
    sameSite: 'lax', // Industry standard for auth cookies
  };

  // Add domain in production to prevent subdomain issues
  if (isProd && process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
      // Only set domain if it's not localhost/IP
      if (!url.hostname.match(/^(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)$/)) {
        config.domain = url.hostname;
      }
    } catch (e) {
      console.warn('[Cookie Config] Failed to parse NEXT_PUBLIC_APP_URL:', e);
    }
  }

  // Add maxAge for setting cookies (not for deletion)
  if (options.includeMaxAge && !options.forDeletion) {
    config.maxAge = 60 * 60 * 24 * 30; // 30 days
  }

  return config;
}

/**
 * Log cookie configuration for debugging
 */
export function logCookieConfig(operation: 'set' | 'delete', config: CookieConfig) {
  console.log(`[Cookie ${operation}]`, {
    domain: config.domain || '(browser default)',
    path: config.path,
    secure: config.secure,
    sameSite: config.sameSite,
    httpOnly: config.httpOnly,
    maxAge: config.maxAge || '(session)',
  });
}
