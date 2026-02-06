import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './server/database.js';
import { startWebSocketServer } from './server/websocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.ts'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', async () => {
  try {
    // Initialize database
    await initializeDatabase();
    // Start WebSocket server
    startWebSocketServer();
    // Create main window
    createWindow();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    process.exit(1);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for database operations
ipcMain.handle('db:getChats', async (_, limit = 50, offset = 0) => {
  const { getChats } = await import('./server/database.js');
  return getChats(limit, offset);
});

ipcMain.handle('db:getMessages', async (_, chatId: string, limit = 50, offset = 0) => {
  const { getMessages } = await import('./server/database.js');
  return getMessages(chatId, limit, offset);
});

ipcMain.handle('db:searchMessages', async (_, chatId: string, query: string) => {
  const { searchMessages } = await import('./server/database.js');
  return searchMessages(chatId, query);
});

ipcMain.handle('db:markChatAsRead', async (_, chatId: string) => {
  const { markChatAsRead } = await import('./server/database.js');
  return markChatAsRead(chatId);
});

ipcMain.handle('db:seedData', async () => {
  const { seedData } = await import('./server/database.js');
  return seedData();
});
