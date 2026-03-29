export interface User {
  uid: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  status?: string;
  online?: boolean;
  lastSeen?: string;
  interests?: string[];
  location?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  preferences?: {
    interestedIn: 'male' | 'female' | 'all';
    minAge: number;
    maxAge: number;
  };
  role?: 'admin' | 'user';
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: Record<string, number>;
  typing?: Record<string, boolean>;
  type: 'direct' | 'group';
  name?: string; // For group chats
  photoURL?: string; // For group chats
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text?: string;
  type: 'text' | 'image' | 'video' | 'voice' | 'file';
  mediaUrl?: string;
  fileUrl?: string;
  fileType?: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'seen';
}

export interface Match {
  id: string;
  uids: string[];
  timestamp: string;
}

export interface Swipe {
  id: string;
  fromUid: string;
  toUid: string;
  type: 'like' | 'skip';
  timestamp: string;
}

export type CallType = 'audio' | 'video';
export type CallStatus = 'calling' | 'ringing' | 'connected' | 'ended';

export interface CallSession {
  id: string;
  type: CallType;
  callerId: string;
  receiverId: string;
  status: CallStatus;
  startTime?: string;
}
