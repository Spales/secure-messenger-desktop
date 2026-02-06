'use client';

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './store/index';
import { WebSocketClient } from './hooks/useWebSocket';
import ChatList from './components/ChatList';
import MessageView from './components/MessageView';
import ConnectionStatus from './components/ConnectionStatus';
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
