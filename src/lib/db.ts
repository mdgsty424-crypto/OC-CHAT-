import { openDB, IDBPDatabase } from 'idb';

export interface LocalMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  type: 'text' | 'image' | 'video' | 'voice' | 'file';
  mediaUrl?: string;
  timestamp: string;
  status: 'pending' | 'sent' | 'delivered' | 'seen';
}

export interface LocalChat {
  id: string;
  name?: string;
  photo?: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: string;
  type: 'direct' | 'group' | 'channel';
}

const DB_NAME = 'oc-chat-db';
const DB_VERSION = 2;

export async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
          messageStore.createIndex('chatId', 'chatId');
          messageStore.createIndex('status', 'status');
        }
        if (!db.objectStoreNames.contains('chats')) {
          db.createObjectStore('chats', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'uid' });
        }
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
        }
      }
      
      if (oldVersion < 2) {
        // Ensure queue has autoIncrement if it didn't before
        if (db.objectStoreNames.contains('queue')) {
          // We can't modify an existing store's autoIncrement property directly.
          // We'd have to delete and recreate it, but that loses data.
          // For a queue, losing data might be okay if it's just a few pending messages,
          // but better to just ensure it's right for new users.
          // However, if the error is persistent, we should probably recreate it.
          db.deleteObjectStore('queue');
        }
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function saveMessage(message: LocalMessage) {
  const db = await initDB();
  await db.put('messages', message);
}

export async function getMessages(chatId: string): Promise<LocalMessage[]> {
  const db = await initDB();
  return db.getAllFromIndex('messages', 'chatId', chatId);
}

export async function saveChat(chat: LocalChat) {
  const db = await initDB();
  await db.put('chats', chat);
}

export async function getChats(): Promise<LocalChat[]> {
  const db = await initDB();
  return db.getAll('chats');
}

export async function addToQueue(item: any) {
  const db = await initDB();
  await db.put('queue', item);
}

export async function getQueue(): Promise<any[]> {
  const db = await initDB();
  return db.getAll('queue');
}

export async function removeFromQueue(id: string | number) {
  const db = await initDB();
  await db.delete('queue', id);
}
