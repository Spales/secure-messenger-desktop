# Security Architecture

This document explains the security design decisions and how sensitive data is protected in Secure Messenger Desktop.

## Security Principles

1. **Boundary-Based Design**: All encryption/decryption operations centralized in `SecurityService`
2. **Defense in Depth**: Multiple layers of protection (process isolation, IPC security, data handling)
3. **Fail Secure**: Default to restrictive behavior, opt-in for less secure operations
4. **Transparent Security**: No silent failures; security issues logged and visible

## Current Security Features

### 1. Process Isolation (Electron)

```typescript
// main.ts - IPC setup with contextIsolation
new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.ts'),
    nodeIntegration: false,      // Renderer cannot access Node.js
    contextIsolation: true,      // Separate context for main & renderer
  }
})
```

**Protection**: Renderer process cannot directly access Electron APIs. All communication goes through secure IPC bridge.

### 2. IPC Security (Preload Script)

```typescript
// preload.ts - Whitelist exposed APIs
const electronAPI = {
  getChats: (limit?: number, offset?: number) =>
    ipcRenderer.invoke('db:getChats', limit, offset),
  getMessages: (chatId: string, limit?: number, offset?: number) =>
    ipcRenderer.invoke('db:getMessages', chatId, limit, offset),
  // ... only safe operations exposed
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
```

**Protection**: Only explicitly whitelisted IPC handlers available to renderer. No generic `invoke` or filesystem access.

### 3. Sensitive Data Handling

#### No Message Logging

```typescript
// BAD - Never do this:
console.log('[WebSocket] Message received:', message);  // ❌ Leaks plaintext

// GOOD - Use secure logging:
secureLog('message-received', {
  chatId: message.chatId,
  messageId: message.id,
  sender: message.sender,
  // message.body NOT included
});
```

#### Database Security Boundaries

```typescript
// All database operations in isolated process (Electron main)
ipcMain.handle('db:getMessages', async (_, chatId: string) => {
  // Runs in main process, not renderer
  // Message bodies not serialized to renderer unnecessarily
  const messages = database.prepare(...).all();
  return messages; // Safe to serialize (encrypted in production)
});
```

#### Message Body Protection in Transit

```typescript
// In production, encryption/decryption happens at boundaries:
- Database stores encrypted ciphertext
- Decryption happens in SecurityService (main process)
- Only decrypted plaintext shown in UI (not transmitted)
```

### 4. Encryption Service Boundary

```typescript
// src/services/security.ts - All crypto operations here
export function encrypt(plaintext: string): EncryptedData {
  // In production: XChaCha20-Poly1305
  return {
    ciphertext: encryptedData,
    nonce: randomNonce,
  };
}

export function decrypt(encrypted: EncryptedData): string {
  // Verify nonce, check authentication tag, decrypt
  return plaintext;
}

// No crypto operations elsewhere in codebase
```

### 5. Secure Logging

```typescript
export function secureLog(action: string, metadata?: Record<string, unknown>) {
  // Only logs action + metadata (NO plaintext message bodies)
  // In production: send to secure audit logging service
  // Includes timestamp, action type, user context (if multi-user)
}

export function sanitizeCrashReport(error: unknown) {
  // Strips sensitive data before sending to error tracking
  return {
    message: error.message,
    stack: error.stack,
    // NO user data, message content, encryption keys
  };
}
```

## Production Security Enhancements

### 1. End-to-End Encryption

**Current State**: No encryption (placeholder only)

**Production Implementation**:

```typescript
// Use libsodium for authenticated encryption
import sodium from 'sodium-plus';

// Pre-shared key derivation
const key = await sodium.crypto_pwhash(
  password,      // User password
  salt,          // 32 random bytes
  opslimit,      // Time cost (Argon2)
  memlimit       // Memory cost
);

// Message encryption
const nonce = sodium.randombytes(24);
const ciphertext = await sodium.crypto_secretbox_seal(
  message,
  nonce,
  key
);

// Store [nonce || ciphertext || auth_tag]
```

### 2. Double Ratchet Algorithm (for group chats)

Implement Signal Protocol for perfect forward secrecy:

```typescript
// Generate ephemeral keys per message
const ephemeralKey = generateKeyPair();
const sharedSecret = computeDH(ephemeralKey.private, recipientKey.public);
const messageKey = deriveKey(sharedSecret, salt);

// Encrypt with ephemeral key in header
const encrypted = {
  ephemeralPublicKey: ephemeralKey.public,  // Sent with message
  ciphertext: encrypt(plaintext, messageKey),
  // Old keys can be securely deleted
};
```

### 3. Key Management

```typescript
// Master Key (in production):
- Stored in Keychain/Credential Manager (not in code)
- Derived from user password + random salt
- Never written to logs or crash dumps

// Encryption Key Rotation:
- Rotate keys monthly or on device compromise
- Old ciphertexts remain decryptable (key versioning)

// Key Destruction:
- Overwrite memory after use (sodium_memzero)
- Never persist unencrypted keys
```

### 4. Transport Security

```typescript
// TLS 1.3 for all connections
const wss = new WebSocket.Server({
  port: 8765,
  ssl: {
    key: fs.readFileSync('private-key.pem'),
    cert: fs.readFileSync('certificate.pem'),
  }
});

// In app: use wss:// instead of ws://
const ws = new WebSocket('wss://localhost:8765');
```

### 5. Database Encryption

```typescript
// SQLite-net (C# only) or sql.js with encryption
// Option 1: File-level encryption (BitLocker, FileVault)
// Option 2: SQLCipher for column-level encryption

const db = new Database('app.db', {
  cipher: 'aes-256-cbc',
  key: encryptionKey,
});
```

### 6. Secure Memory

```typescript
// Use sodium_malloc for sensitive buffers
const keyBuffer = sodium.malloc(32);
// ... use keyBuffer ...
// Overwrite before deallocation
sodium.memzero(keyBuffer);

// For JavaScript: Web Crypto API
const key = await crypto.subtle.importKey(
  'raw',
  keyBytes,
  { name: 'AES-GCM' },
  false,  // non-extractable
  ['encrypt', 'decrypt']
);
```

## Threat Model

### In Scope (Protected)

- **Eavesdropping**: TLS + E2E encryption prevents network sniffing
- **Tampering**: Authenticated encryption detects modified messages
- **Replay**: Nonce-based encryption prevents message reuse
- **Offline Access**: Database encryption protects stored messages
- **Process Compromise**: Separate process isolation limits damage

### Out of Scope (Not Protected)

- **Physical Access**: Device compromise allows key extraction
- **Keyloggers**: Cannot prevent software keylogging on compromised machine
- **Screenshot/Screen Recording**: Application-level encryption cannot prevent
- **Malicious Updates**: Code signing required (user must verify)

## Security Testing Checklist

- [ ] No plaintext message bodies in console logs
- [ ] No sensitive data in DevTools (production)
- [ ] No message content in crash reports
- [ ] IPC communication uses only whitelisted methods
- [ ] Database queries prevent SQL injection
- [ ] Encryption boundaries tested with unit tests
- [ ] Connection drop recovery doesn't leak state
- [ ] Offline data remains encrypted

## Security Incident Response

If a vulnerability is discovered:

1. **Immediate**: Disable affected feature or update requirement
2. **Analysis**: Determine scope (how many users/records affected)
3. **Notification**: Contact affected users with remediation steps
4. **Patch**: Release security update with CVE if applicable
5. **Postmortem**: Analyze root cause and prevent recurrence

## Compliance & Standards

- **OWASP Top 10**: Addresses injection, broken auth, sensitive data exposure
- **NIST Cybersecurity Framework**: Identifies, protects, detects, responds, recovers
- **GDPR Data Protection**: Encryption, audit logging, user access control
- **CWE Top 25**: Avoids common weaknesses (hard-coded secrets, unvalidated input)

## Code Review Guidelines

Security-sensitive code:

1. All changes to `SecurityService` require 2 reviewers
2. IPC handlers must validate all inputs (chatId, limit, etc.)
3. Database queries must use prepared statements
4. Environment variables never contain secrets (use Keychain)
5. Comments should explain security decisions

## Resources

- [OWASP Application Security](https://owasp.org/)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [Signal Protocol](https://signal.org/docs/)
- [libsodium Documentation](https://doc.libsodium.org/)
- [SQLCipher](https://www.zetetic.net/sqlcipher/)

## Security Contact

Please report security issues to security@example.com (do not use GitHub issues).

Include:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)
