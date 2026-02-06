'use client';

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/index';
import './ConnectionStatus.css';

const ConnectionStatus: React.FC = () => {
  const { state: connectionState } = useSelector((state: RootState) => state.connection);
  const [simulatingDrop, setSimulatingDrop] = useState(false);

  const handleSimulateConnectionDrop = async () => {
    setSimulatingDrop(true);

    try {
      // Simulate drop by closing the server connection
      // In a real app, this would trigger server-side connection close
      console.log('Simulating connection drop...');
      // Reset after a delay
      setTimeout(() => setSimulatingDrop(false), 3000);
    } catch (error) {
      console.error('Failed to simulate drop:', error);
      setSimulatingDrop(false);
    }
  };

  const statusColor = {
    connected: 'connected',
    reconnecting: 'reconnecting',
    offline: 'offline',
  }[connectionState];

  return (
    <div className="connection-status-container">
      <div className={`status-indicator ${statusColor}`}>
        <div className="status-dot" />
        <span className="status-text">
          {connectionState === 'connected' && 'Connected'}
          {connectionState === 'reconnecting' && 'Reconnecting...'}
          {connectionState === 'offline' && 'Offline'}
        </span>
      </div>

      <button
        onClick={handleSimulateConnectionDrop}
        disabled={connectionState !== 'connected' || simulatingDrop}
        className="simulate-drop-btn"
        title="Simulate a connection drop to test recovery"
      >
        {simulatingDrop ? 'Simulating Drop...' : 'Simulate Drop'}
      </button>
    </div>
  );
};

export default ConnectionStatus;
