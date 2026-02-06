/**
 * Type definitions for Electron API exposed via preload script
 */

export interface Chat {
  id: string;
  title: string;
  lastMessageAt: number;
  unreadCount: number;
}

export interface Message {
  id: string;
  chatId: string;
  ts: number;
  sender: string;
  body: string;
}

export interface ElectronAPI {
  getChats(limit?: number, offset?: number): Promise<Chat[]>;
  getMessages(chatId: string, limit?: number, offset?: number): Promise<Message[]>;
  searchMessages(chatId: string, query: string): Promise<Message[]>;
  markChatAsRead(chatId: string): Promise<void>;
  seedData(): Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
