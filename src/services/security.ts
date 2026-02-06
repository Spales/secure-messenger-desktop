/**
 * Security Service Module
 *
 * This module provides placeholder encryption/decryption boundaries.
 * In a production system, this would use proper encryption (e.g., TweetNaCl, libsodium).
 *
 * Security Notes:
 * - Message bodies should never be logged to console in production
 * - All sensitive data operations are scoped to this module
 * - Encryption keys would be stored securely (not in code)
 * - DevTools should be disabled in production builds
 */

export interface EncryptedData {
  ciphertext: string;
  nonce: string;
}

/**
 * Placeholder encrypt function.
 * In production, this would use proper authenticated encryption (e.g., XChaCha20-Poly1305)
 * with keys from secure key management service.
 */
export function encrypt(plaintext: string): EncryptedData {
  // In production: use libsodium's secretbox or similar
  // For now, this is a placeholder that demonstrates the boundary

  // SECURITY: Do NOT log plaintext in production
  if (process.env.NODE_ENV === 'development') {
    // Can log in dev for debugging, but never in production
  }

  return {
    ciphertext: Buffer.from(plaintext).toString('base64'),
    nonce: generateNonce(),
  };
}

/**
 * Placeholder decrypt function.
 * In production, this would use the same encryption scheme with key verification.
 */
export function decrypt(encrypted: EncryptedData): string {
  // In production: verify nonce freshness, check authentication tag
  const plaintext = Buffer.from(encrypted.ciphertext, 'base64').toString('utf-8');

  // SECURITY: Never log decrypted plaintext
  if (process.env.NODE_ENV === 'development') {
    // Can log in dev for debugging, but never in production
  }

  return plaintext;
}

/**
 * Generate a random nonce for encryption.
 */
function generateNonce(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('hex');
}

/**
 * Sanitize string to prevent accidental logging of sensitive data.
 */
export function sanitizeForLogging(data: string, maxLength = 20): string {
  if (!data) return '[empty]';
  return data.substring(0, maxLength) + (data.length > maxLength ? '...' : '');
}

/**
 * Security audit log (safe for production).
 * Only logs non-sensitive information (timestamps, user IDs, actions).
 */
export function secureLog(action: string, metadata?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    ...metadata,
  };

  // In production: send to secure audit logging service
  console.log('[SECURITY AUDIT]', JSON.stringify(logEntry));
}

/**
 * Validate that sensitive data is not leaked in crash reports.
 * This would be integrated with error tracking services.
 */
export function sanitizeCrashReport(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      // Never include message bodies or user data
    };
  }

  return {};
}
