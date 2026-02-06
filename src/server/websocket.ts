import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, addMessage } from './database';

const WS_PORT = 8765;
const HEARTBEAT_INTERVAL = 10000; // 10 seconds
const MESSAGE_EMIT_INTERVAL = 2000; // 2-3 seconds

let wss: WebSocket.Server | null = null;
let messageEmitterInterval: NodeJS.Timeout | null = null;
let isEmittingMessages = true;

export function startWebSocketServer(): void {
  wss = new WebSocket.Server({ port: WS_PORT });

  console.log(`[WebSocket] Server running on ws://localhost:${WS_PORT}`);

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WebSocket] Client connected');

    // Send initial connection message
    ws.send(
      JSON.stringify({
        type: 'connected',
        timestamp: Date.now(),
      })
    );

    // Setup heartbeat
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, HEARTBEAT_INTERVAL);

    ws.on('pong', () => {
      // Connection is alive
    });

    ws.on('close', () => {
      clearInterval(heartbeatInterval);
      console.log('[WebSocket] Client disconnected');
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Error:', error.message);
    });
  });

  // Start emitting synthetic messages
  startMessageEmitter();
}

function startMessageEmitter(): void {
  if (messageEmitterInterval) {
    return;
  }

  messageEmitterInterval = setInterval(() => {
    if (!isEmittingMessages) {
      return;
    }

    try {
      const db = getDatabase();
      const chats = db
        .prepare('SELECT id FROM chats ORDER BY RANDOM() LIMIT 1')
        .all() as Array<{ id: string }>;

      if (chats.length === 0) return;

      const chatId = chats[0].id;
      const senders = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
      const messageTexts = [
        'Hey, how are you?',
        'Just finished the project',
        'Let\'s sync up tomorrow',
        'Did you see the update?',
        'Looks good to me',
        'I agree completely',
        'When are you free?',
        'Can we schedule a meeting?',
        'Thanks for the help',
        'No problem, happy to assist',
      ];

      const sender = senders[Math.floor(Math.random() * senders.length)];
      const body = messageTexts[Math.floor(Math.random() * messageTexts.length)];
      const ts = Date.now();
      const messageId = uuidv4();

      // Add to database
      addMessage(chatId, sender, body, ts);

      // Broadcast to all connected clients
      const event = {
        type: 'newMessage',
        chatId,
        messageId,
        ts,
        sender,
        body,
      };

      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(event));
          }
        });
      }

      console.log(`[WebSocket] Emitted message to chat ${chatId.substring(0, 8)}`);
    } catch (error) {
      console.error('[WebSocket] Error emitting message:', error);
    }
  }, MESSAGE_EMIT_INTERVAL + Math.random() * 1000);
}

export function stopMessageEmitter(): void {
  isEmittingMessages = false;
  if (messageEmitterInterval) {
    clearInterval(messageEmitterInterval);
    messageEmitterInterval = null;
  }
}

export function resumeMessageEmitter(): void {
  isEmittingMessages = true;
  if (!messageEmitterInterval) {
    startMessageEmitter();
  }
}

export function simulateConnectionDrop(): void {
  if (wss) {
    wss.clients.forEach((client) => {
      client.close();
    });
  }
}
