import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ConnectionState = 'connected' | 'reconnecting' | 'offline';

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

export interface AppState {
  connection: {
    state: ConnectionState;
    reconnectAttempt: number;
    backoffDelay: number;
  };
  chats: {
    items: Chat[];
    selectedId: string | null;
    isLoading: boolean;
    offset: number;
    hasMore: boolean;
  };
  messages: {
    items: Message[];
    isLoading: boolean;
    offset: number;
    hasMore: boolean;
  };
  search: {
    query: string;
    results: Message[];
    isSearching: boolean;
  };
}

const connectionSlice = createSlice({
  name: 'connection',
  initialState: {
    state: 'offline' as ConnectionState,
    reconnectAttempt: 0,
    backoffDelay: 1000,
  },
  reducers: {
    setConnectionState: (state, action: PayloadAction<ConnectionState>) => {
      state.state = action.payload;
      if (action.payload === 'connected') {
        state.reconnectAttempt = 0;
        state.backoffDelay = 1000;
      }
    },
    incrementReconnectAttempt: (state) => {
      state.reconnectAttempt += 1;
      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      state.backoffDelay = Math.min(1000 * Math.pow(2, state.reconnectAttempt - 1), 30000);
    },
  },
});

const chatsSlice = createSlice({
  name: 'chats',
  initialState: {
    items: [] as Chat[],
    selectedId: null as string | null,
    isLoading: false,
    offset: 0,
    hasMore: true,
  },
  reducers: {
    setChats: (state, action: PayloadAction<Chat[]>) => {
      state.items = action.payload;
      state.isLoading = false;
    },
    appendChats: (state, action: PayloadAction<Chat[]>) => {
      state.items = [...state.items, ...action.payload];
      state.offset += action.payload.length;
      state.hasMore = action.payload.length >= 50;
      state.isLoading = false;
    },
    selectChat: (state, action: PayloadAction<string>) => {
      state.selectedId = action.payload;
    },
    updateChatUnreadCount: (state, action: PayloadAction<{ chatId: string; unreadCount: number }>) => {
      const chat = state.items.find((c) => c.id === action.payload.chatId);
      if (chat) {
        chat.unreadCount = action.payload.unreadCount;
      }
    },
    updateChatLastMessage: (state, action: PayloadAction<{ chatId: string; ts: number }>) => {
      const chat = state.items.find((c) => c.id === action.payload.chatId);
      if (chat) {
        chat.lastMessageAt = action.payload.ts;
        // Sort chats by lastMessageAt
        state.items.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
      }
    },
    setChatsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

const messagesSlice = createSlice({
  name: 'messages',
  initialState: {
    items: [] as Message[],
    isLoading: false,
    offset: 0,
    hasMore: true,
  },
  reducers: {
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.items = action.payload.reverse();
      state.offset = 0;
      state.isLoading = false;
    },
    prependMessages: (state, action: PayloadAction<Message[]>) => {
      state.items = [...action.payload.reverse(), ...state.items];
      state.offset += action.payload.length;
      state.hasMore = action.payload.length >= 50;
      state.isLoading = false;
    },
    appendMessage: (state, action: PayloadAction<Message>) => {
      state.items.push(action.payload);
    },
    setMessagesLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearMessages: (state) => {
      state.items = [];
      state.offset = 0;
      state.hasMore = true;
    },
  },
});

const searchSlice = createSlice({
  name: 'search',
  initialState: {
    query: '',
    results: [] as Message[],
    isSearching: false,
  },
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload;
    },
    setSearchResults: (state, action: PayloadAction<Message[]>) => {
      state.results = action.payload;
      state.isSearching = false;
    },
    setSearching: (state, action: PayloadAction<boolean>) => {
      state.isSearching = action.payload;
    },
    clearSearch: (state) => {
      state.query = '';
      state.results = [];
      state.isSearching = false;
    },
  },
});

export const store = configureStore({
  reducer: {
    connection: connectionSlice.reducer,
    chats: chatsSlice.reducer,
    messages: messagesSlice.reducer,
    search: searchSlice.reducer,
  },
});

export const connectionActions = connectionSlice.actions;
export const chatsActions = chatsSlice.actions;
export const messagesActions = messagesSlice.actions;
export const searchActions = searchSlice.actions;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
