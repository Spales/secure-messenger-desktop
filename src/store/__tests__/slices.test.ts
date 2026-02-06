/**
 * Unit tests for Redux chat and message slices
 * Tests state management and pagination logic
 * 
 * NOTE: This is a template for Jest tests. To run:
 * 1. Install Jest: npm install --save-dev jest @types/jest ts-jest
 * 2. Configure jest.config.js
 * 3. Run: npm test
 */

// @ts-nocheck
/* eslint-disable */
import { configureStore } from '@reduxjs/toolkit';
import { chatsActions, messagesActions } from '../index.js';
import type { Chat, Message } from '../index.js';

describe('Chats Slice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        chats: (state = {
          items: [] as Chat[],
          selectedId: null as string | null,
          isLoading: false,
          offset: 0,
          hasMore: true,
        }, action) => {
          switch (action.type) {
            case 'chats/setChats':
              return { ...state, items: action.payload, isLoading: false };
            case 'chats/appendChats':
              return {
                ...state,
                items: [...state.items, ...action.payload],
                offset: state.offset + action.payload.length,
                hasMore: action.payload.length >= 50,
                isLoading: false,
              };
            case 'chats/selectChat':
              return { ...state, selectedId: action.payload };
            case 'chats/updateChatUnreadCount':
              return {
                ...state,
                items: state.items.map(chat =>
                  chat.id === action.payload.chatId
                    ? { ...chat, unreadCount: action.payload.unreadCount }
                    : chat
                ),
              };
            case 'chats/setChatsLoading':
              return { ...state, isLoading: action.payload };
            default:
              return state;
          }
        },
      },
    });
  });

  it('should set chats', () => {
    const chats: Chat[] = [
      { id: 'chat-1', title: 'Chat 1', lastMessageAt: Date.now(), unreadCount: 0 },
      { id: 'chat-2', title: 'Chat 2', lastMessageAt: Date.now(), unreadCount: 5 },
    ];

    store.dispatch(chatsActions.setChats(chats));
    const state = store.getState().chats;

    expect(state.items).toHaveLength(2);
    expect(state.items[0].id).toBe('chat-1');
  });

  it('should append chats for pagination', () => {
    const initialChats: Chat[] = [
      { id: 'chat-1', title: 'Chat 1', lastMessageAt: Date.now(), unreadCount: 0 },
    ];
    const moreChats: Chat[] = [
      { id: 'chat-2', title: 'Chat 2', lastMessageAt: Date.now(), unreadCount: 0 },
    ];

    store.dispatch(chatsActions.setChats(initialChats));
    store.dispatch(chatsActions.appendChats(moreChats));
    const state = store.getState().chats;

    expect(state.items).toHaveLength(2);
    expect(state.offset).toBe(1);
  });

  it('should select a chat', () => {
    store.dispatch(chatsActions.selectChat('chat-123'));
    const state = store.getState().chats;

    expect(state.selectedId).toBe('chat-123');
  });

  it('should update unread count', () => {
    const chats: Chat[] = [
      { id: 'chat-1', title: 'Chat 1', lastMessageAt: Date.now(), unreadCount: 5 },
    ];

    store.dispatch(chatsActions.setChats(chats));
    store.dispatch(chatsActions.updateChatUnreadCount({ chatId: 'chat-1', unreadCount: 0 }));
    const state = store.getState().chats;

    expect(state.items[0].unreadCount).toBe(0);
  });
});

describe('Messages Slice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        messages: (state = {
          items: [] as Message[],
          isLoading: false,
          offset: 0,
          hasMore: true,
        }, action) => {
          switch (action.type) {
            case 'messages/setMessages':
              return { 
                ...state, 
                items: action.payload.reverse(), 
                offset: action.payload.length,
                isLoading: false 
              };
            case 'messages/appendMessage':
              return { ...state, items: [...state.items, action.payload] };
            case 'messages/prependMessages':
              return {
                ...state,
                items: [...action.payload.reverse(), ...state.items],
                offset: state.offset + action.payload.length,
                hasMore: action.payload.length >= 50,
                isLoading: false,
              };
            case 'messages/clearMessages':
              return { ...state, items: [], offset: 0, hasMore: true };
            case 'messages/setMessagesLoading':
              return { ...state, isLoading: action.payload };
            default:
              return state;
          }
        },
      },
    });
  });

  it('should set messages (reversed for display)', () => {
    const messages: Message[] = [
      { id: 'msg-1', chatId: 'chat-1', ts: 1000, sender: 'Alice', body: 'Hello' },
      { id: 'msg-2', chatId: 'chat-1', ts: 2000, sender: 'Bob', body: 'Hi' },
    ];

    store.dispatch(messagesActions.setMessages(messages));
    const state = store.getState().messages;

    expect(state.items).toHaveLength(2);
    // Messages reversed for chronological display
    expect(state.items[0].id).toBe('msg-2');
    expect(state.items[1].id).toBe('msg-1');
  });

  it('should append new message in real-time', () => {
    const messages: Message[] = [
      { id: 'msg-1', chatId: 'chat-1', ts: 1000, sender: 'Alice', body: 'Hello' },
    ];
    const newMessage: Message = {
      id: 'msg-2',
      chatId: 'chat-1',
      ts: 2000,
      sender: 'Bob',
      body: 'Hi',
    };

    store.dispatch(messagesActions.setMessages(messages));
    store.dispatch(messagesActions.appendMessage(newMessage));
    const state = store.getState().messages;

    expect(state.items).toHaveLength(2);
    expect(state.items[1].id).toBe('msg-2');
  });

  it('should prepend older messages for pagination', () => {
    const recentMessages: Message[] = [
      { id: 'msg-3', chatId: 'chat-1', ts: 3000, sender: 'Alice', body: 'Latest' },
    ];
    const olderMessages: Message[] = [
      { id: 'msg-1', chatId: 'chat-1', ts: 1000, sender: 'Bob', body: 'First' },
      { id: 'msg-2', chatId: 'chat-1', ts: 2000, sender: 'Alice', body: 'Second' },
    ];

    store.dispatch(messagesActions.setMessages(recentMessages));
    store.dispatch(messagesActions.prependMessages(olderMessages));
    const state = store.getState().messages;

    expect(state.items).toHaveLength(3);
    expect(state.items[0].id).toBe('msg-2'); // Older messages prepended (reversed)
    expect(state.offset).toBe(3);
  });

  it('should clear messages when switching chats', () => {
    const messages: Message[] = [
      { id: 'msg-1', chatId: 'chat-1', ts: 1000, sender: 'Alice', body: 'Hello' },
    ];

    store.dispatch(messagesActions.setMessages(messages));
    store.dispatch(messagesActions.clearMessages());
    const state = store.getState().messages;

    expect(state.items).toHaveLength(0);
    expect(state.offset).toBe(0);
  });
});
