import { connectionActions, messagesActions, chatsActions } from '../store/index';
import type { AppDispatch, Message } from '../store/index';
import type { Store } from '@reduxjs/toolkit';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private store: Store | null = null;
  private maxReconnectAttempts = 10;

  public connect(store: Store): void {
    this.store = store;
    this.attemptConnection();
  }

  private attemptConnection(): void {
    try {
      this.ws = new WebSocket('ws://localhost:8765');

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        if (this.store) {
          const dispatch = this.store.dispatch as AppDispatch;
          dispatch(connectionActions.setConnectionState('connected'));
        }
        this.resetHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'connected') {
            console.log('[WebSocket] Server connection confirmed');
            return;
          }

          if (data.type === 'newMessage' && this.store) {
            const dispatch = this.store.dispatch as AppDispatch;
            const state = this.store.getState();

            // Add message to store
            const message: Message = {
              id: data.messageId,
              chatId: data.chatId,
              ts: data.ts,
              sender: data.sender,
              body: data.body,
            };

            // Update chat unread count and last message time
            dispatch(chatsActions.updateChatLastMessage({
              chatId: data.chatId,
              ts: data.ts,
            }));

            // If this chat is selected, append message to view
            if (state.chats.selectedId === data.chatId) {
              dispatch(messagesActions.appendMessage(message));
            } else {
              // Update unread count for non-selected chats
              dispatch(chatsActions.updateChatUnreadCount({
                chatId: data.chatId,
                unreadCount: state.chats.items.find((c) => c.id === data.chatId)?.unreadCount || 0 + 1,
              }));
            }
          }

          this.resetHeartbeat();
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        if (this.store) {
          const dispatch = this.store.dispatch as AppDispatch;
          dispatch(connectionActions.setConnectionState('offline'));
        }
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.clearHeartbeat();
        if (this.store) {
          const dispatch = this.store.dispatch as AppDispatch;
          dispatch(connectionActions.setConnectionState('reconnecting'));
        }
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  private resetHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatTimeout = setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 10000); // 10 second heartbeat
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempt += 1;

    if (this.store) {
      const dispatch = this.store.dispatch as AppDispatch;
      dispatch(connectionActions.incrementReconnectAttempt());
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt - 1), 30000);
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempt = this.store?.getState().connection.reconnectAttempt || 0;
      this.attemptConnection();
    }, delay);
  }

  public disconnect(): void {
    this.clearHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public simulateConnectionDrop(): void {
    if (this.ws) {
      this.ws.close();
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export function useWebSocket() {
  return {
    WebSocketClient,
  };
}
