import { create } from 'zustand';
import { User } from '../types';

interface WebRTCState {
  incomingCall: {
    callId: string;
    callerId: string;
    callerName: string;
    callerPhoto: string;
    type: 'audio' | 'video';
  } | null;
  setIncomingCall: (call: WebRTCState['incomingCall']) => void;
  
  activeCallId: string | null;
  setActiveCallId: (id: string | null) => void;
  
  otherUser: User | null;
  setOtherUser: (user: User | null) => void;
  
  callType: 'audio' | 'video';
  setCallType: (type: 'audio' | 'video') => void;
  
  callStatus: 'connecting' | 'ringing' | 'active' | 'ended' | 'rejected';
  setCallStatus: (status: WebRTCState['callStatus']) => void;
  
  localStream: MediaStream | null;
  setLocalStream: (stream: MediaStream | null) => void;
  
  remoteStream: MediaStream | null;
  setRemoteStream: (stream: MediaStream | null) => void;
  
  isPiPMode: boolean;
  setIsPiPMode: (isPiP: boolean) => void;
  
  isMicOn: boolean;
  setIsMicOn: (on: boolean) => void;
  
  isCameraOn: boolean;
  setIsCameraOn: (on: boolean) => void;

  pc: RTCPeerConnection | null;
  setPc: (pc: RTCPeerConnection | null) => void;
}

export const useWebRTCStore = create<WebRTCState>((set) => ({
  incomingCall: null,
  setIncomingCall: (incomingCall) => set({ incomingCall }),
  
  activeCallId: null,
  setActiveCallId: (activeCallId) => set({ activeCallId }),
  
  otherUser: null,
  setOtherUser: (otherUser) => set({ otherUser }),
  
  callType: 'video',
  setCallType: (callType) => set({ callType }),
  
  callStatus: 'connecting',
  setCallStatus: (callStatus) => set({ callStatus }),
  
  localStream: null,
  setLocalStream: (localStream) => set({ localStream }),
  
  remoteStream: null,
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  
  isPiPMode: false,
  setIsPiPMode: (isPiPMode) => set({ isPiPMode }),
  
  isMicOn: true,
  setIsMicOn: (isMicOn) => set({ isMicOn }),
  
  isCameraOn: true,
  setIsCameraOn: (isCameraOn) => set({ isCameraOn }),

  pc: null,
  setPc: (pc) => set({ pc }),
}));
