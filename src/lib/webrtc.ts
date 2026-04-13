import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  onSnapshot, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { db } from './firebase';

export const ICE_SERVERS = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

export interface CallData {
  callerId: string;
  receiverId: string;
  type: 'audio' | 'video';
  offer?: any;
  answer?: any;
  status: 'ringing' | 'active' | 'ended' | 'rejected';
  createdAt: any;
}

export const createCall = async (callerId: string, receiverId: string, type: 'audio' | 'video', callerName: string, callerPhoto: string) => {
  const callDoc = doc(collection(db, 'calls'));
  const callId = callDoc.id;

  // 1. Set incomingCall in receiver's document to trigger UI
  const receiverRef = doc(db, 'users', receiverId);
  await updateDoc(receiverRef, {
    incomingCall: {
      callId,
      callerId,
      callerName,
      callerPhoto,
      type
    }
  });

  // 2. Initialize call document
  await setDoc(callDoc, {
    callerId,
    receiverId,
    type,
    status: 'ringing',
    createdAt: serverTimestamp()
  });

  return callId;
};

export const endCall = async (callId: string, receiverId?: string) => {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, { status: 'ended' });
    
    if (receiverId) {
      const receiverRef = doc(db, 'users', receiverId);
      await updateDoc(receiverRef, { incomingCall: null });
    }
    
    // Optional: Delete candidates subcollections or the whole doc after some time
    // For now, just mark as ended
  } catch (error) {
    console.error("Error ending call:", error);
  }
};

export const rejectCall = async (callId: string, receiverId: string) => {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, { status: 'rejected' });
    
    const receiverRef = doc(db, 'users', receiverId);
    await updateDoc(receiverRef, { incomingCall: null });
  } catch (error) {
    console.error("Error rejecting call:", error);
  }
};
