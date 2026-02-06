/**
 * Unit tests for database queries
 * Tests pagination, indexes, and query efficiency
 * 
 * NOTE: This is a template for Jest tests. To run:
 * 1. Install Jest: npm install --save-dev jest @types/jest ts-jest
 * 2. Configure jest.config.js
 * 3. Run: npm test
 */

// @ts-nocheck
/* eslint-disable */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.join(__dirname, 'test.db');

describe('Database Queries', () => {
  let db: Database.Database;

  beforeAll(() => {
    // Create test database
    db = new Database(testDbPath);
    db.pragma('journal_mode = WAL');

    // Create schema
    db.exec(`
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

      CREATE INDEX idx_chat_ts ON messages(chatId, ts DESC);
      CREATE INDEX idx_chat_id ON messages(chatId);
      CREATE INDEX idx_chats_last_message ON chats(lastMessageAt DESC);
    `);

    // Seed test data
    const insertChat = db.prepare(
      'INSERT INTO chats (id, title, lastMessageAt, unreadCount, createdAt) VALUES (?, ?, ?, ?, ?)'
    );
    
    const insertMessage = db.prepare(
      'INSERT INTO messages (id, chatId, ts, sender, body, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const now = Date.now();

    // Create 10 test chats
    for (let i = 1; i <= 10; i++) {
      insertChat.run(`chat-${i}`, `Test Chat ${i}`, now - i * 1000, i % 3, now);
    }

    // Create 50 messages for chat-1
    for (let i = 1; i <= 50; i++) {
      insertMessage.run(
        `msg-${i}`,
        'chat-1',
        now - i * 1000,
        'TestUser',
        `Test message ${i}`,
        now - i * 1000
      );
    }
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    // Clean up WAL files
    [testDbPath + '-wal', testDbPath + '-shm'].forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  });

  it('should fetch chats with pagination', () => {
    const query = db.prepare(
      'SELECT * FROM chats ORDER BY lastMessageAt DESC LIMIT ? OFFSET ?'
    );

    const page1 = query.all(5, 0) as Array<{ id: string; title: string }>;
    const page2 = query.all(5, 5) as Array<{ id: string; title: string }>;

    expect(page1).toHaveLength(5);
    expect(page2).toHaveLength(5);
    expect(page1[0].id).toBe('chat-1'); // Most recent
    expect(page2[0].id).toBe('chat-6');
  });

  it('should fetch messages for a chat with pagination', () => {
    const query = db.prepare(
      'SELECT * FROM messages WHERE chatId = ? ORDER BY ts DESC LIMIT ? OFFSET ?'
    );

    const messages = query.all('chat-1', 20, 0) as Array<{ id: string; body: string }>;

    expect(messages).toHaveLength(20);
    expect(messages[0].id).toBe('msg-1'); // Most recent
  });

  it('should search messages by substring', () => {
    const query = db.prepare(
      'SELECT * FROM messages WHERE chatId = ? AND body LIKE ? LIMIT 50'
    );

    const results = query.all('chat-1', '%message 1%') as Array<{ id: string; body: string }>;

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(50);
    results.forEach(msg => {
      expect(msg.body.toLowerCase()).toContain('message 1');
    });
  });

  it('should use indexes efficiently (explain query plan)', () => {
    const plan = db.prepare(
      'EXPLAIN QUERY PLAN SELECT * FROM messages WHERE chatId = ? ORDER BY ts DESC LIMIT 50'
    ).all('chat-1');

    const planStr = JSON.stringify(plan);
    // Should use index, not scan table
    expect(planStr.toLowerCase()).toContain('index');
  });

  it('should handle mark as read operation', () => {
    const update = db.prepare('UPDATE chats SET unreadCount = 0 WHERE id = ?');
    const select = db.prepare('SELECT unreadCount FROM chats WHERE id = ?');

    update.run('chat-1');
    const result = select.get('chat-1') as { unreadCount: number };

    expect(result.unreadCount).toBe(0);
  });

  it('should handle concurrent reads (WAL mode)', () => {
    // WAL mode allows concurrent reads
    const query1 = db.prepare('SELECT COUNT(*) as count FROM chats');
    const query2 = db.prepare('SELECT COUNT(*) as count FROM messages');

    const result1 = query1.get() as { count: number };
    const result2 = query2.get() as { count: number };

    expect(result1.count).toBe(10);
    expect(result2.count).toBe(50);
  });
});
