import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { app } from 'electron';

const dbPath = path.join(app.getPath('userData'), 'app.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export async function initializeDatabase(): Promise<void> {
  const database = getDatabase();

  // Create tables
  database.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      lastMessageAt INTEGER NOT NULL,
      unreadCount INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chatId TEXT NOT NULL,
      ts INTEGER NOT NULL,
      sender TEXT NOT NULL,
      body TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(chatId) REFERENCES chats(id)
    );

    CREATE INDEX IF NOT EXISTS idx_chat_ts ON messages(chatId, ts DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_id ON messages(chatId);
  `);

  // Check if data already exists
  const chatCount = database.prepare('SELECT COUNT(*) as count FROM chats').get() as { count: number };
  if (chatCount.count === 0) {
    await seedData();
  }
}

export async function seedData(): Promise<void> {
  const database = getDatabase();
  const now = Date.now();

  // Generate 200 chats with 20,000+ messages
  const chats = Array.from({ length: 200 }, (_, i) => ({
    id: uuidv4(),
    title: `Chat ${i + 1}`,
    createdAt: now,
  }));

  const insertChat = database.prepare(
    'INSERT INTO chats (id, title, lastMessageAt, unreadCount, createdAt) VALUES (?, ?, ?, ?, ?)'
  );

  const insertMessage = database.prepare(
    'INSERT INTO messages (id, chatId, ts, sender, body, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const transaction = database.transaction(() => {
    const senders = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
    const messages = [
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
      'See you at 3pm',
      'Perfect, see you then',
      'What do you think?',
      'Sounds like a plan',
      'Let me know ASAP',
    ];

    let globalMessageCount = 0;

    for (const chat of chats) {
      insertChat.run(chat.id, chat.title, now, 0, chat.createdAt);

      // Generate 100-150 messages per chat
      const messageCountPerChat = Math.floor(Math.random() * 50) + 100;

      for (let i = 0; i < messageCountPerChat; i++) {
        const sender = senders[Math.floor(Math.random() * senders.length)];
        const body = messages[Math.floor(Math.random() * messages.length)];
        const ts = now - Math.random() * 7 * 24 * 60 * 60 * 1000; // Last 7 days

        insertMessage.run(
          uuidv4(),
          chat.id,
          ts,
          sender,
          body,
          now
        );

        globalMessageCount++;
      }
    }

    // Update lastMessageAt for each chat
    const getLastMessage = database.prepare(
      'SELECT MAX(ts) as ts FROM messages WHERE chatId = ?'
    );
    const updateChat = database.prepare(
      'UPDATE chats SET lastMessageAt = ? WHERE id = ?'
    );

    for (const chat of chats) {
      const lastMessage = getLastMessage.get(chat.id) as { ts: number } | undefined;
      if (lastMessage?.ts) {
        updateChat.run(lastMessage.ts, chat.id);
      }
    }

    console.log(`[Database] Seeded ${globalMessageCount} messages across ${chats.length} chats`);
  });

  transaction();
}

export function getChats(limit: number = 50, offset: number = 0): Array<{
  id: string;
  title: string;
  lastMessageAt: number;
  unreadCount: number;
}> {
  const database = getDatabase();
  const query = database.prepare(`
    SELECT id, title, lastMessageAt, unreadCount
    FROM chats
    ORDER BY lastMessageAt DESC
    LIMIT ? OFFSET ?
  `);

  return query.all(limit, offset) as Array<{
    id: string;
    title: string;
    lastMessageAt: number;
    unreadCount: number;
  }>;
}

export function getMessages(
  chatId: string,
  limit: number = 50,
  offset: number = 0
): Array<{
  id: string;
  chatId: string;
  ts: number;
  sender: string;
  body: string;
}> {
  const database = getDatabase();
  const query = database.prepare(`
    SELECT id, chatId, ts, sender, body
    FROM messages
    WHERE chatId = ?
    ORDER BY ts DESC
    LIMIT ? OFFSET ?
  `);

  return query.all(chatId, limit, offset) as Array<{
    id: string;
    chatId: string;
    ts: number;
    sender: string;
    body: string;
  }>;
}

export function searchMessages(chatId: string, query: string): Array<{
  id: string;
  chatId: string;
  ts: number;
  sender: string;
  body: string;
}> {
  const database = getDatabase();
  const searchQuery = database.prepare(`
    SELECT id, chatId, ts, sender, body
    FROM messages
    WHERE chatId = ? AND body LIKE ?
    ORDER BY ts DESC
    LIMIT 50
  `);

  return searchQuery.all(chatId, `%${query}%`) as Array<{
    id: string;
    chatId: string;
    ts: number;
    sender: string;
    body: string;
  }>;
}

export function markChatAsRead(chatId: string): void {
  const database = getDatabase();
  const query = database.prepare('UPDATE chats SET unreadCount = 0 WHERE id = ?');
  query.run(chatId);
}

export function addMessage(
  chatId: string,
  sender: string,
  body: string,
  ts: number
): void {
  const database = getDatabase();
  const insertMessage = database.prepare(`
    INSERT INTO messages (id, chatId, ts, sender, body, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const updateChat = database.prepare(`
    UPDATE chats
    SET lastMessageAt = ?, unreadCount = unreadCount + 1
    WHERE id = ?
  `);

  const transaction = database.transaction(() => {
    insertMessage.run(uuidv4(), chatId, ts, sender, body, Date.now());
    updateChat.run(ts, chatId);
  });

  transaction();
}
