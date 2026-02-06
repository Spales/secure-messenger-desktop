'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FixedSizeList as List } from 'react-window';
import { messagesActions, searchActions } from '../store/index.js';
import type { RootState, AppDispatch } from '../store/index.js';
import './MessageView.css';

const MessageView: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedChatId = useSelector((state: RootState) => state.chats.selectedId);
  const { items: messages, isLoading, offset, hasMore } = useSelector(
    (state: RootState) => state.messages
  );
  const { results: searchResults, isSearching } = useSelector(
    (state: RootState) => state.search
  );

  const displayMessages = searchOpen ? searchResults : messages;

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleLoadOlderMessages = useCallback(async () => {
    if (!selectedChatId || isLoading || !hasMore) return;

    dispatch(messagesActions.setMessagesLoading(true));

    try {
      const oldMessages = await window.electronAPI.getMessages(selectedChatId, 50, offset);

      dispatch(messagesActions.prependMessages(oldMessages));
    } catch (error) {
      console.error('Failed to load older messages:', error);
      dispatch(messagesActions.setMessagesLoading(false));
    }
  }, [selectedChatId, isLoading, offset, hasMore, dispatch]);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!selectedChatId) return;

      setSearchQuery(query);
      dispatch(searchActions.setSearchQuery(query));

      if (!query.trim()) {
        dispatch(searchActions.clearSearch());
        return;
      }

      dispatch(searchActions.setSearching(true));

      try {
        const results = await window.electronAPI.searchMessages(selectedChatId, query);
        dispatch(searchActions.setSearchResults(results));
      } catch (error) {
        console.error('Search failed:', error);
        dispatch(searchActions.setSearching(false));
      }
    },
    [selectedChatId, dispatch]
  );

  const handleCloseSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    dispatch(searchActions.clearSearch());
  };

  const MessageRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const message = displayMessages[index];

    if (!message) return <div style={style} />;

    const date = new Date(message.ts);
    const timeStr = date.toLocaleTimeString();

    return (
      <div style={style} className="message-item">
        <div className="message-sender">{message.sender}</div>
        <div className="message-body">{message.body}</div>
        <div className="message-time">{timeStr}</div>
      </div>
    );
  };

  if (!selectedChatId) {
    return (
      <div className="message-view-container">
        <div className="empty-state">
          <p>Select a chat to view messages</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-view-container">
      <div className="message-header">
        <h2>Messages</h2>
        <div className="message-controls">
          {searchOpen ? (
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
            />
          ) : (
            <button onClick={() => setSearchOpen(true)} className="search-btn">
              🔍
            </button>
          )}
          {searchOpen && (
            <button onClick={handleCloseSearch} className="close-btn">
              ✕
            </button>
          )}
        </div>
      </div>

      {hasMore && (
        <button
          onClick={handleLoadOlderMessages}
          disabled={isLoading || !hasMore}
          className="load-older-btn"
        >
          {isLoading ? 'Loading...' : 'Load Older Messages'}
        </button>
      )}

      <List
        height={600}
        itemCount={displayMessages.length}
        itemSize={80}
        width="100%"
      >
        {MessageRow}
      </List>
    </div>
  );
};

export default MessageView;
