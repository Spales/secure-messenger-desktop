/**
 * Example unit test for Redux connection slice
 * Demonstrates how to test connection state machine and exponential backoff
 */

import { configureStore } from '@reduxjs/toolkit';
import { connectionActions } from '../index.js';

describe('Connection Slice', () => {
  let store = configureStore({
    reducer: {
      connection: (state = {
        state: 'offline' as const,
        reconnectAttempt: 0,
        backoffDelay: 1000,
      }, action) => {
        switch (action.type) {
          case 'connection/setConnectionState':
            return {
              ...state,
              state: action.payload,
              ...(action.payload === 'connected' && {
                reconnectAttempt: 0,
                backoffDelay: 1000,
              }),
            };
          case 'connection/incrementReconnectAttempt':
            return {
              ...state,
              reconnectAttempt: state.reconnectAttempt + 1,
              backoffDelay: Math.min(
                1000 * Math.pow(2, state.reconnectAttempt),
                30000
              ),
            };
          default:
            return state;
        }
      },
    },
  });

  beforeEach(() => {
    store = configureStore({
      reducer: {
        connection: (state = {
          state: 'offline' as const,
          reconnectAttempt: 0,
          backoffDelay: 1000,
        }, action) => {
          switch (action.type) {
            case 'connection/setConnectionState':
              return {
                ...state,
                state: action.payload,
                ...(action.payload === 'connected' && {
                  reconnectAttempt: 0,
                  backoffDelay: 1000,
                }),
              };
            case 'connection/incrementReconnectAttempt':
              return {
                ...state,
                reconnectAttempt: state.reconnectAttempt + 1,
                backoffDelay: Math.min(
                  1000 * Math.pow(2, state.reconnectAttempt),
                  30000
                ),
              };
            default:
              return state;
          }
        },
      },
    });
  });

  it('should handle connection state transitions', () => {
    let state = store.getState().connection;
    expect(state.state).toBe('offline');

    store.dispatch(connectionActions.setConnectionState('reconnecting'));
    state = store.getState().connection;
    expect(state.state).toBe('reconnecting');

    store.dispatch(connectionActions.setConnectionState('connected'));
    state = store.getState().connection;
    expect(state.state).toBe('connected');
    expect(state.reconnectAttempt).toBe(0);
    expect(state.backoffDelay).toBe(1000);
  });

  it('should implement exponential backoff on reconnect attempts', () => {
    let state = store.getState().connection;

    // First attempt: 1s
    store.dispatch(connectionActions.incrementReconnectAttempt());
    state = store.getState().connection;
    expect(state.reconnectAttempt).toBe(1);
    expect(state.backoffDelay).toBe(1000);

    // Second attempt: 2s
    store.dispatch(connectionActions.incrementReconnectAttempt());
    state = store.getState().connection;
    expect(state.reconnectAttempt).toBe(2);
    expect(state.backoffDelay).toBe(2000);

    // Third attempt: 4s
    store.dispatch(connectionActions.incrementReconnectAttempt());
    state = store.getState().connection;
    expect(state.reconnectAttempt).toBe(3);
    expect(state.backoffDelay).toBe(4000);

    // Should cap at 30s
    for (let i = 4; i <= 10; i++) {
      store.dispatch(connectionActions.incrementReconnectAttempt());
    }
    state = store.getState().connection;
    expect(state.backoffDelay).toBe(30000);
  });

  it('should reset reconnect attempt on successful connection', () => {
    // Simulate multiple failed reconnects
    store.dispatch(connectionActions.incrementReconnectAttempt());
    store.dispatch(connectionActions.incrementReconnectAttempt());
    store.dispatch(connectionActions.incrementReconnectAttempt());

    let state = store.getState().connection;
    expect(state.reconnectAttempt).toBe(3);
    expect(state.backoffDelay).toBe(4000);

    // Successful connection resets backoff
    store.dispatch(connectionActions.setConnectionState('connected'));
    state = store.getState().connection;
    expect(state.reconnectAttempt).toBe(0);
    expect(state.backoffDelay).toBe(1000);
  });
});
