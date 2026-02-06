'use client';

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './store/index.js';
import { WebSocketClient } from './hooks/useWebSocket.js';
import ChatList from './components/ChatList.js';
import MessageView from './components/MessageView.js';
import ConnectionStatus from './components/ConnectionStatus.js';
import './App.css';

const App: React.FC = () => {
  const [wsClient] = useState(() => new WebSocketClient());

  useEffect(() => {
    // Initialize database
    window.electronAPI.seedData().catch(() => {
      // Data might already be seeded
    });

    // Connect WebSocket
    wsClient.connect(store);

    return () => {
      wsClient.disconnect();
    };
  }, [wsClient]);

  return (
    <Provider store={store}>
      <div className="app-container">
        <ConnectionStatus />
        <div className="main-content">
          <ChatList />
          <MessageView />
        </div>
      </div>
    </Provider>
  );
};

export default App;
