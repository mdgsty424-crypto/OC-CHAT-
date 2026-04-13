export interface User {
  uid: string;
  displayName: string;
  email?: string;
  username?: string;
  photoURL?: string;
  coverURL?: string;
  bio?: string;
  status?: string;
  online?: boolean;
  lastSeen?: string;
  interests?: string[];
  location?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  role?: 'admin' | 'user';
  verified?: boolean;
  isPremium?: boolean;
  suspended?: boolean;
  walletBalance?: number;
  pinnedChats?: string[];
  blockedUsers?: string[];
  securitySettings?: {
    appLockEnabled: boolean;
    twoStepVerificationEnabled: boolean;
    privacyModeEnabled: boolean; // Screenshot protection
    pin?: string; // 4-digit PIN
  };
  preferences?: {
    interestedIn: 'male' | 'female' | 'all';
    minAge: number;
    maxAge: number;
    theme?: 'light' | 'dark';
    language?: 'en' | 'bn';
    notificationsEnabled?: boolean;
    isMuted?: boolean;
  };
  // Identity Verification Fields (Private)
  nameBangla?: string;
  nameEnglish?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;
  ocId?: string;
  signatureURL?: string;
  bloodGroup?: string;
  nidNo?: string;
  barcode?: string;
  // Public Identity Fields
  sex?: string;
  birthYear?: number;
  isSeller?: boolean;
  sellerInfo?: {
    shopName: string;
    phone: string;
    address: string;
  };
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: Record<string, number>;
  typing?: Record<string, boolean>;
  type: 'direct' | 'group' | 'channel';
  name?: string; // For group chats
  photo?: string; // For group chats
  isArchived?: Record<string, boolean>; // userId -> boolean
  isHidden?: Record<string, boolean>; // userId -> boolean
  isLocked?: Record<string, boolean>; // userId -> boolean
  password?: string; // For hidden chats
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text?: string;
  type: 'text' | 'image' | 'video' | 'voice' | 'file' | 'location' | 'contact' | 'poll' | 'call' | 'call_history' | 'sticker';
  messageType?: 'text' | 'image' | 'video' | 'voice' | 'file' | 'location' | 'contact' | 'poll' | 'call' | 'call_history' | 'sticker';
  mediaUrl?: string;
  fileUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  fileType?: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'seen' | 'uploading' | 'pending';
  reactions?: Record<string, string[]>; // emoji -> list of userIds
  replyTo?: string; // ID of the message being replied to
  isSelfDestruct?: boolean;
  destructTime?: number; // in seconds
  translatedText?: string;
  voiceToText?: string;
  poll?: {
    question: string;
    options: { text: string; votes: string[] }[];
    multipleChoice: boolean;
  };
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  contact?: {
    name: string;
    phone: string;
  };
  call?: {
    type: 'audio' | 'video';
    status: 'started' | 'ended';
    duration?: number; // in seconds
  };
  callType?: 'audio' | 'video';
  duration?: number; // in seconds
  forwardedFrom?: {
    uid: string;
    displayName: string;
    photoURL?: string;
  };
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

export interface Meeting {
  id: string;
  hostId: string;
  title: string;
  startTime: string;
  participants: string[];
  isActive: boolean;
  type: 'public' | 'private';
}

export interface CallSession {
  id: string;
  type: CallType;
  callerId: string;
  receiverId: string;
  status: CallStatus;
  startTime?: string;
  timestamp: string;
  meetingLink?: string;
  isScreenSharing?: boolean;
  isWhiteboardActive?: boolean;
  waitingRoom?: string[]; // list of userIds waiting to join
  signalData?: any; // For WebRTC signaling
}

export interface Group {
  id: string;
  name: string;
  description: string;
  photo: string;
  members: string[];
  lastMessage: string;
  lastMessageTime: string;
  type: 'group' | 'channel';
  roles?: Record<string, string[]>; // roleName -> list of userIds
  permissions?: Record<string, string[]>; // roleName -> list of permissions
  voiceRoom?: {
    isActive: boolean;
    participants: string[];
    startTime: string;
    hostId?: string;
  };
}

export interface Transaction {
  id: string;
  senderId: string;
  receiverId: string;
  amount: number;
  type: 'send' | 'receive' | 'payment';
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  note?: string;
}

export interface Story {
  id: string;
  userId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  likes: string[]; // UIDs
  views: number;
  timestamp: string;
  comments?: {
    userId: string;
    text: string;
    timestamp: string;
  }[];
}
