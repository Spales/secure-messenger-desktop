# Desktop Application Notice

This project is a **desktop application** built with Electron and cannot run in web browsers or online preview environments.

## Why Preview Doesn't Work

The v0 preview environment is browser-based and cannot:
- Run Electron (desktop framework)
- Access local SQLite database
- Run WebSocket server
- Execute native Node.js code
- Build/compile Electron binaries

## How to Run Locally

This application must be downloaded and run on your computer:

1. **Download the code** from the v0 project
2. **Install dependencies**: `npm install`
3. **Start development**: `npm run dev:electron`

Or follow the complete setup guide in [QUICKSTART.md](./QUICKSTART.md)

## Project Structure

```
src/
├── main.ts              # Electron main process
├── preload.ts           # IPC security bridge
├── App.tsx              # React root component
├── server/
│   ├── database.ts      # SQLite integration
│   └── websocket.ts     # WebSocket sync server
├── services/
│   └── security.ts      # Encryption & security
├── components/          # React UI components
├── hooks/               # Custom React hooks
└── store/               # Redux state management
```

## Key Technologies

- **Electron** - Desktop app framework
- **SQLite** - Local database (better-sqlite3)
- **WebSocket** - Real-time sync
- **React** - UI framework
- **Redux** - State management
- **TypeScript** - Type safety

## What You Get

Once running locally, you'll have:
- Virtualized chat list with 200 chats
- 20,000+ messages searchable and paginated
- Real-time WebSocket sync simulator
- Connection health monitoring with auto-recovery
- Production-ready security architecture

See [README.md](./README.md) for full documentation.
