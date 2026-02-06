import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // Database operations
  getChats: (limit?: number, offset?: number) =>
    ipcRenderer.invoke('db:getChats', limit, offset),
  getMessages: (chatId: string, limit?: number, offset?: number) =>
    ipcRenderer.invoke('db:getMessages', chatId, limit, offset),
  searchMessages: (chatId: string, query: string) =>
    ipcRenderer.invoke('db:searchMessages', chatId, query),
  markChatAsRead: (chatId: string) =>
    ipcRenderer.invoke('db:markChatAsRead', chatId),
  seedData: () =>
    ipcRenderer.invoke('db:seedData'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
