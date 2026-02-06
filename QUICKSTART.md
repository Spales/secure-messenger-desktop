# Quick Start Guide

Get Secure Messenger Desktop running in minutes.

## 30-Second Setup

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm install run dev
# That's it! The app opens automatically
```

The app will:

- Create SQLite database at `./app.db`
- Seed 200 chats with 20,000+ messages
- Start WebSocket server on `ws://localhost:8765`
- Open Electron window connected to React dev server

## What You'll See

### On Launch

- Connection status: "Connected" (green dot)
- Chat list with 200 chats sorted by most recent
- Empty message view (click a chat to load messages)

### Real-time Demo

1. **Select a chat** - messages load instantly (virtualized list)
2. **Watch messages arrive** - every 2-3 seconds, new message appears
3. **See unread badges** - chats you haven't selected show unread count
4. **Search messages** - click search icon, type "hello" to find messages
5. **Test recovery** - click "Simulate Drop" button to trigger reconnection

## Common Tasks

### Load Older Messages

```
In message view, click "Load Older Messages" button
→ Fetches older 50 messages with pagination
```

### Search in Current Chat

```
In message view, click search icon (🔍)
→ Type substring (e.g., "hello")
→ Shows up to 50 matching messages
→ Click ✕ to clear search
```

### Test Connection Recovery

```
1. Click "Simulate Drop" button
2. Watch status change to "Reconnecting..." (orange pulsing)
3. Wait 1-2 seconds
4. Status returns to "Connected" (exponential backoff)
```

### Check Database Directly

```bash
# View database schema
sqlite3 app.db ".schema"

# Query chats
sqlite3 app.db "SELECT id, title, unreadCount FROM chats LIMIT 5;"

# Count total messages
sqlite3 app.db "SELECT COUNT(*) FROM messages;"

# View last 10 messages
sqlite3 app.db "SELECT sender, body FROM messages ORDER BY ts DESC LIMIT 10;"
```

## Architecture Overview

```
Your Click
    ↓
React Component (ChatList.tsx)
    ↓
IPC Call (preload.ts)
    ↓
Electron Main Process (main.ts)
    ↓
SQLite Database (app.db)
    ↓
Redux Store (Redux slice)
    ↓
React Component Re-renders
```

## File Locations

| Component | Location                   | Notes                        |
| --------- | -------------------------- | ---------------------------- |
| Database  | `./app.db`                 | SQLite, created on first run |
| React UI  | `src/components/*.tsx`     | React + TypeScript           |
| Electron  | `src/main.ts`              | Node.js + Electron           |
| WebSocket | `src/server/websocket.ts`  | Local server                 |
| Redux     | `src/store/index.ts`       | State management             |
| Security  | `src/services/security.ts` | Encryption boundaries        |

## Debugging Tips

### Check Console

```bash
# React errors appear in browser DevTools
# Electron console logs appear in terminal
```

### View Redux State

```bash
# In DevTools console (F12 in Electron window)
store.getState()                    # See full state
store.getState().connection         # Connection state
store.getState().chats.selectedId   # Selected chat
```

### Check Database

```bash
# Kill the app first
# Then query the database
sqlite3 app.db "SELECT COUNT(*) FROM messages WHERE chatId = 'xxx';"
```

### Network Traffic

```bash
# Check WebSocket messages in DevTools → Network tab
# Filter by WS (WebSocket)
# Look for "type": "newMessage" events
```

## Performance Tips

### For Large Lists

- The app uses virtualization - renders only visible items
- Scrolling through 20,000 messages = smooth 60fps
- No need to optimize unless adding >100,000 messages

### For Database Queries

- All queries use pagination (load 50 at a time)
- Indexes optimize filtering by chatId and timestamp
- Search uses LIKE (substring match) - can be slow for large chats

## Troubleshooting

### Port 8765 Already in Use

```bash
# Kill process using the port
lsof -ti:8765 | xargs kill -9    # macOS/Linux
taskkill /PID $(netstat -ano | findstr :8765 | awk '{print $5}') /F  # Windows
```

### Database Locked Error

```bash
# Close the app and remove temporary files
rm app.db-wal app.db-shm

# Restart the app
npm run dev
```

### React Dev Server Not Loading

```bash
# Make sure port 3000 is free
lsof -ti:3000 | xargs kill -9    # macOS/Linux

# If that doesn't work, restart from scratch
rm -rf node_modules
npm install
npm run dev
```

### WebSocket Connection Failed

```
Check terminal output for [WebSocket] messages
Usually means port 8765 is blocked
Try closing other apps using that port
```

## Next Steps

### Learn the Codebase

1. **Start with `App.tsx`** - root component structure
2. **Then `src/store/index.ts`** - Redux store and slices
3. **Then `src/components/`** - UI components
4. **Then `src/server/`** - backend (database + WebSocket)

### Modify Features

- **Add new Redux slice** → update store/index.ts
- **Add new component** → create in src/components/
- **Add new IPC handler** → update src/main.ts + src/preload.ts
- **Change database** → update src/server/database.ts

### Build for Production

```bash
npm run build       # Single platform
npm run build:all   # All platforms (macOS, Windows, Linux)
```

## Documentation Files

- **README.md** - Full feature list and setup
- **SECURITY.md** - Security architecture and best practices
- **ARCHITECTURE.md** - Detailed system design and diagrams
- **IMPLEMENTATION_SUMMARY.md** - What was built and why

## Key Concepts

### Virtualization

- Don't render all 20,000 items
- Render only visible + buffer items (~20 total)
- Massive performance improvement

### Pagination

- Don't load all 20,000 messages at once
- Load 50 at a time (fits on screen)
- Click "Load Older" to fetch next batch

### Real-time Sync

- WebSocket emits new message every 2-3s
- Client receives event
- Redux state updates
- React components re-render
- All automatic, no polling needed

### Connection Recovery

- If WebSocket drops, automatically reconnect
- Exponential backoff: 1s, 2s, 4s, ..., 30s
- Stop retrying after 10 attempts
- Reset backoff counter on successful connection

## API Reference

### IPC (Electron → React)

```typescript
window.electronAPI.getChats(limit?, offset?)     // Get chat list
window.electronAPI.getMessages(chatId, limit?, offset?)  // Get messages
window.electronAPI.searchMessages(chatId, query)  // Search in chat
window.electronAPI.markChatAsRead(chatId)        // Mark chat as read
window.electronAPI.seedData()                    // Reseed database
```

### Redux Actions

```typescript
dispatch(connectionActions.setConnectionState("connected"));
dispatch(chatsActions.selectChat(chatId));
dispatch(messagesActions.appendMessage(message));
dispatch(searchActions.setSearchQuery(query));
```

### Database Queries

```
Chat list: SELECT * FROM chats ORDER BY lastMessageAt DESC LIMIT 50
Messages: SELECT * FROM messages WHERE chatId=? ORDER BY ts DESC LIMIT 50
Search: SELECT * FROM messages WHERE chatId=? AND body LIKE ? LIMIT 50
```

## Performance Expectations

| Operation           | Time  | Notes                 |
| ------------------- | ----- | --------------------- |
| App startup         | 2s    | Electron + React      |
| Load 50 chats       | 10ms  | Virtualized           |
| Load 50 messages    | 5ms   | Indexed query         |
| Search in chat      | 50ms  | Substring match       |
| New message arrival | <20ms | Redux update → render |
| Scroll 20,000 items | 60fps | Virtualized           |

## Common Customizations

### Change Message Emission Rate

```typescript
// src/server/websocket.ts
const MESSAGE_EMIT_INTERVAL = 2000; // Change to 5000 for 5 seconds
```

### Change Chat List Size

```typescript
// src/components/ChatList.tsx
const CHATS_PER_PAGE = 50; // Change to 100 for more at once
```

### Change Reconnect Strategy

```typescript
// src/hooks/useWebSocket.ts
private maxReconnectAttempts = 10;  // Change to limit retries
const maxDelay = 30000;             // Change max backoff delay
```

### Change Colors/Theme

```css
/* src/App.css and src/components/*.css */
--primary: #007aff; /* iOS blue */
--background: #0d0d0d; /* Dark gray */
--text: #ffffff; /* White */
```

## Support

### Issues or Questions?

1. Check the docs: README.md, ARCHITECTURE.md, SECURITY.md
2. Check troubleshooting section above
3. Review the example code in src/components/
4. Look at unit tests in src/store/**tests**/

### Making Changes?

- All changes are type-safe (TypeScript)
- Use Redux DevTools to debug state changes
- Run unit tests with npm test (after setup)

---

**Enjoy the Application!**

For detailed information, see:

- Setup: README.md
- Security: SECURITY.md
- Architecture: ARCHITECTURE.md
