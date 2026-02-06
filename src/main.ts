import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { initializeDatabase } from './server/database';
import { startWebSocketServer } from './server/websocket';

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  console.log('[Main] Loading URL:', startUrl);
  console.log('[Main] __dirname:', __dirname);

  mainWindow.loadURL(startUrl);

  // Always open dev tools to debug
  mainWindow.webContents.openDevTools();

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
  const { getChats } = await import('./server/database');
  return getChats(limit, offset);
});

ipcMain.handle('db:getMessages', async (_, chatId: string, limit = 50, offset = 0) => {
  const { getMessages } = await import('./server/database');
  return getMessages(chatId, limit, offset);
});

ipcMain.handle('db:searchMessages', async (_, chatId: string, query: string) => {
  const { searchMessages } = await import('./server/database');
  return searchMessages(chatId, query);
});

ipcMain.handle('db:markChatAsRead', async (_, chatId: string) => {
  const { markChatAsRead } = await import('./server/database');
  return markChatAsRead(chatId);
});

ipcMain.handle('db:seedData', async () => {
  const { seedData } = await import('./server/database');
  return seedData();
});
