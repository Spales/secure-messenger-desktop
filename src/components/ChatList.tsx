'use client';

import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FixedSizeList as List } from 'react-window';
import { chatsActions, messagesActions } from '../store/index.js';
import type { RootState, AppDispatch, Chat } from '../store/index.js';
import './ChatList.css';

const ChatList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, selectedId, isLoading, offset, hasMore } = useSelector(
    (state: RootState) => state.chats
  );

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    if (isLoading || !hasMore) return;

    dispatch(chatsActions.setChatsLoading(true));

    try {
      const chats = await window.electronAPI.getChats(50, offset);

      if (offset === 0) {
        dispatch(chatsActions.setChats(chats));
      } else {
        dispatch(chatsActions.appendChats(chats));
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
      dispatch(chatsActions.setChatsLoading(false));
    }
  };

  const handleSelectChat = useCallback(
    async (chat: Chat) => {
      dispatch(chatsActions.selectChat(chat.id));
      dispatch(messagesActions.clearMessages());

      // Mark as read
      if (chat.unreadCount > 0) {
        await window.electronAPI.markChatAsRead(chat.id);
        dispatch(
          chatsActions.updateChatUnreadCount({
            chatId: chat.id,
            unreadCount: 0,
          })
        );
      }

      // Load messages
      try {
        const messages = await window.electronAPI.getMessages(chat.id, 50, 0);
        dispatch(messagesActions.setMessages(messages));
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    },
    [dispatch]
  );

  const handleLoadMore = () => {
    loadChats();
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const chat = items[index];

    if (!chat) {
      return <div style={style} className="chat-item loading" />;
    }

    const isSelected = selectedId === chat.id;
    const date = new Date(chat.lastMessageAt);
    const timeStr = formatTime(date);

    return (
      <div
        style={style}
        className={`chat-item ${isSelected ? 'selected' : ''}`}
        onClick={() => handleSelectChat(chat)}
      >
        <div className="chat-header">
          <div className="chat-title">{chat.title}</div>
          <div className="chat-time">{timeStr}</div>
        </div>
        <div className="chat-footer">
          <div className="chat-preview">Last message at {timeStr}</div>
          {chat.unreadCount > 0 && (
            <div className="unread-badge">{chat.unreadCount}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="chat-list-container">
      <div className="chat-list-header">
        <h2>Chats</h2>
        <button
          onClick={handleLoadMore}
          disabled={isLoading || !hasMore}
          className="load-more-btn"
        >
          {isLoading ? 'Loading...' : hasMore ? 'Load More' : 'All Loaded'}
        </button>
      </div>

      <List
        height={600}
        itemCount={Math.max(items.length, 50)}
        itemSize={80}
        width="100%"
      >
        {Row}
      </List>
    </div>
  );
};

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';

  return date.toLocaleDateString();
}

export default ChatList;
