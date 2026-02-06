# Secure Messenger Desktop

A secure, efficient messenger client built with Electron + React + TypeScript, demonstrating best practices in real-time synchronization, database performance, and security architecture.

## Features

- **Efficient Local Storage**: SQLite database with optimized indexes and pagination
- **Real-time Sync**: WebSocket server emitting synthetic messages with exponential backoff reconnection
- **Performance**: React virtualization (react-window) for handling large chat/message lists
- **Connection Health**: Robust connection state machine with heartbeat and recovery strategies
- **Security Boundaries**: Clear encryption/decryption service module boundaries
- **Clean Architecture**: Redux Toolkit for state management with modular server/client separation

## Technical Stack

- **Frontend**: React 18 + TypeScript + Redux Toolkit
- **Backend**: Electron with Node.js + WebSocket (ws library)
- **Database**: SQLite (better-sqlite3) with WAL mode
- **Performance**: react-window for virtualized lists

## Setup & Installation

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Development mode (runs both React dev server and Electron)
npm run dev

# Build for production
npm run build

# Build for all platforms (macOS, Windows, Linux)
npm run build:all
```

## Project Structure

```
src/
├── main.ts                    # Electron main process + IPC handlers
├── preload.ts                 # Secure IPC bridge
├── App.tsx                    # Root React component
├── index.tsx                  # React entry point
│
├── server/
│   ├── database.ts            # SQLite layer with queries
│   └── websocket.ts           # WebSocket server + message emitter
│
├── services/
│   └── security.ts            # Encryption boundaries + audit logging
│
├── store/
│   └── index.ts               # Redux Toolkit store + slices
│
├── hooks/
│   └── useWebSocket.ts        # WebSocket client with reconnection logic
│
├── components/
│   ├── ChatList.tsx           # Virtualized chat list (50px per item)
│   ├── MessageView.tsx        # Virtualized messages + search
│   ├── ConnectionStatus.tsx   # Connection indicator + simulation
│   └── *.css                  # Component styles
│
└── *.css                      # Global styles
```

## Architecture Overview

### Data Flow

```
Electron Main Process
  ├── SQLite Database (app.db)
  ├── WebSocket Server (ws://localhost:8765)
  └── IPC Channel (preload.ts)
    │
    └─→ React Components (UI)
      ├── ChatList (virtualized)
      ├── MessageView (virtualized + search)
      └── ConnectionStatus
```

### Database Schema

```sql
-- Chats table (indexed by lastMessageAt for efficient sorting)
chats (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  lastMessageAt INTEGER NOT NULL,
  unreadCount INTEGER DEFAULT 0,
  createdAt INTEGER NOT NULL
)

-- Messages table (indexed for chat-based queries)
messages (
  id TEXT PRIMARY KEY,
  chatId TEXT NOT NULL,
  ts INTEGER NOT NULL,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  INDEX idx_chat_ts (chatId, ts DESC),     -- For pagination within chat
  INDEX idx_chat_id (chatId)                -- For join queries
)
```

### Key Queries

All queries use efficient pagination to avoid loading full tables:

1. **Chat List**: `SELECT ... FROM chats ORDER BY lastMessageAt DESC LIMIT 50 OFFSET ?`
2. **Messages**: `SELECT ... FROM messages WHERE chatId = ? ORDER BY ts DESC LIMIT 50 OFFSET ?`
3. **Search**: `SELECT ... FROM messages WHERE chatId = ? AND body LIKE ? LIMIT 50`

### State Management (Redux)

```typescript
store: {
  connection: {
    state: 'connected' | 'reconnecting' | 'offline',
    reconnectAttempt: number,
    backoffDelay: number  // Exponential: 1s, 2s, 4s, 8s, ..., max 30s
  },
  chats: {
    items: Chat[],
    selectedId: string | null,
    isLoading: boolean,
    offset: number,
    hasMore: boolean
  },
  messages: {
    items: Message[],
    isLoading: boolean,
    offset: number,
    hasMore: boolean
  },
  search: {
    query: string,
    results: Message[],
    isSearching: boolean
  }
}
```

### Connection Health & Recovery

```
Initial State: Offline
    ↓
[User clicks/App loads]
    ↓
Attempt WebSocket Connection
    ↓
Connected ←─ (Success)
    │
    └─→ Heartbeat every 10s (ws.ping)
        ↓
        Connection closes unexpectedly
        ↓
        State: Reconnecting
        ↓
        Exponential Backoff:
        - Attempt 1: wait 1s
        - Attempt 2: wait 2s
        - Attempt 3: wait 4s
        - ... (max 30s)
        ↓
        Retry connection
        ↓
        Success → State: Connected (reset backoff)
```

### Message Sync Flow

```
WebSocket Server (every 2-3s)
  ├─ Select random chat
  ├─ Generate synthetic message
  ├─ Write to SQLite (via transaction)
  ├─ Broadcast to all connected clients
  └─ Update chat.lastMessageAt & unreadCount

React Components
  ├─ Receive WebSocket event
  ├─ Update Redux store
  ├─ If chat is selected: append to messages list
  └─ If chat is not selected: increment unreadCount
```

## Performance Optimizations

### 1. Database

- **WAL Mode**: Enables concurrent reads while writing
- **Indexes**: Composite index on (chatId, ts) for efficient message pagination
- **Pagination**: Load 50 items at a time (both chats and messages)
- **Prepared Statements**: Prevent SQL injection and improve performance
- **Transactions**: Batch operations for consistency

### 2. React UI

- **Virtualization**: react-window renders only visible items
  - Chat list: 350px width, 80px per item = ~7-8 visible items (renders ~20 with buffer)
  - Message list: full width, 80px per item = ~7 visible items
- **Memoization**: Callbacks wrapped in `useCallback` to prevent re-renders
- **Redux Selectors**: Components only re-render when their slice changes

### 3. WebSocket

- **Message Batching**: Could batch multiple messages before broadcast
- **Heartbeat**: 10s interval keeps connection alive and detects disconnects
- **Connection Pooling**: All clients share one WebSocket server instance

## Security Architecture

### Security Boundaries

```typescript
SecurityService (src/services/security.ts)
├── encrypt(plaintext): EncryptedData
│   └── In production: XChaCha20-Poly1305 with authenticated encryption
├── decrypt(encrypted): plaintext
│   └── In production: Verify authentication tag + nonce freshness
├── sanitizeForLogging(data): string
│   └── Prevent accidental logging of message bodies
├── secureLog(action, metadata)
│   └── Audit logging (never logs plaintext)
└── sanitizeCrashReport(error)
    └── Strip sensitive data from error reports
```

### Security Practices Implemented

1. **No Message Logging**: Message bodies never logged to console
   ```typescript
   // BAD - Never do this in production:
   console.log('Message:', message.body);
   
   // GOOD - Secure audit logging:
   secureLog('message-received', { chatId, messageId, sender });
   ```

2. **Encryption Boundaries**: All encryption/decryption centralized in SecurityService
   ```typescript
   // Components and database layer don't call crypto directly
   // All sensitive operations routed through SecurityService
   ```

3. **IPC Security**: Preload script uses `contextIsolation: true`
   ```typescript
   // Prevents renderer process from accessing Electron APIs directly
   // Only whitelisted methods exposed via preload.ts
   ```

4. **Sensitive Data Handling**:
   - Message bodies stored encrypted in database (in production)
   - DevTools disabled in production builds
   - No sensitive data in process environment variables
   - Crash reports sanitized before sending

### Production Security Improvements

If this were a real messenger, we would:

1. **Encryption**:
   - Use libsodium (via sodium.js) for authenticated encryption
   - Key derivation from user password (Argon2 or scrypt)
   - Per-message nonces stored with ciphertext

2. **End-to-End Encryption**:
   - Implement Double Ratchet Algorithm (Signal protocol)
   - Key exchange via public key infrastructure
   - Perfect forward secrecy

3. **Transport Security**:
   - TLS/SSL for WebSocket connections (wss://)
   - Certificate pinning for additional protection
   - Rate limiting and DDoS protection

4. **Audit & Monitoring**:
   - Centralized secure logging service
   - Log integrity verification
   - Anomaly detection

5. **Data Sanitization**:
   - No sensitive data in logs, crash dumps, or memory
   - Secure memory wiping after use
   - No plaintext storage of encryption keys

## Trade-offs & Future Improvements

### What Works Well

✅ **Efficient pagination**: Load only visible data
✅ **Responsive UI**: Virtualization prevents lag with large lists
✅ **Robust connection**: Exponential backoff prevents server storms
✅ **Clean architecture**: Separate server/client with clear boundaries
✅ **Type-safe**: Full TypeScript with Redux Toolkit

### What Needs More Time

⏳ **E2E Encryption**: Currently placeholder only (requires protocol design)
⏳ **Message Search**: Limited to current chat (could add full-text search index)
⏳ **Offline Support**: Store pending messages when offline
⏳ **Message Reactions**: Not implemented
⏳ **Media Support**: Images/files not supported yet
⏳ **User Authentication**: No multi-user support (single-user desktop app)
⏳ **Database Encryption**: SQLite-net (encrypted database at rest)
⏳ **Tests**: No unit tests yet (would add for connection logic, DB queries)

### If I Had More Time

1. **Encryption**: Implement proper XChaCha20-Poly1305 encryption
2. **Full-Text Search**: SQLite FTS5 module for better message search
3. **Offline Queue**: Store messages typed while offline, sync when reconnected
4. **Compression**: DEFLATE compression for WebSocket messages
5. **Database Backup**: Automated encrypted backups
6. **Performance Monitoring**: Track render times and query performance
7. **Unit Tests**: Test connection recovery, DB pagination, search
8. **Error Handling**: Better user feedback for network/database errors
9. **Accessibility**: ARIA labels, keyboard navigation
10. **Settings UI**: User preferences, notification settings

## Running the Application

### Development

```bash
npm run dev
```

This starts:
- React dev server on http://localhost:3000
- Electron window pointing to React dev server
- WebSocket server on ws://localhost:8765
- SQLite database at ./app.db

### Testing Connection Recovery

1. Click "Simulate Drop" button while connected
2. Watch status indicator change to "Reconnecting"
3. Observe exponential backoff strategy
4. Connection automatically recovers after a few seconds

### Seeding Data

On first run, the app automatically seeds:
- 200 chats
- ~20,000 messages distributed across chats

You can trigger reseed via the database API.

## Building for Production

```bash
npm run build:all
```

Creates distributable packages for:
- macOS (.dmg)
- Windows (.exe)
- Linux (.AppImage)

## Troubleshooting

### Port 8765 Already in Use
```bash
# Kill the process using port 8765
lsof -ti:8765 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :8765   # Windows
```

### Database Locked
The WAL mode handles this automatically, but if you see "database is locked":
- Close all Electron windows
- Delete `app.db-wal` and `app.db-shm` files
- Restart the app

### WebSocket Connection Fails
- Ensure port 8765 is accessible
- Check firewall settings
- Verify WebSocket server started in main process logs

## Architecture Decisions

### Why Redux Toolkit?
- Clear unidirectional data flow
- Reducers for predictable state updates
- DevTools integration for debugging
- Works well with React components

### Why react-window?
- Only renders visible items (efficient for large lists)
- Fixed item height allows precise calculations
- 60 FPS scrolling even with thousands of items
- Small bundle size (~20KB)

### Why SQLite?
- Zero-configuration database
- Self-contained single file
- ACID compliance for data integrity
- Efficient pagination with indexes
- Built-in FTS for full-text search

### Why WebSocket?
- Real-time bidirectional communication
- Low latency (no polling overhead)
- Automatic reconnection support
- Built-in ping/pong for health checks

## License

MIT

## Security Reporting

If you find a security vulnerability, please email security@example.com instead of using the issue tracker.
