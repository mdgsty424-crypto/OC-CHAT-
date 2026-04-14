import { create } from 'zustand';

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
  localStream: MediaStream | null;
  setLocalStream: (stream: MediaStream | null) => void;
  remoteStream: MediaStream | null;
  setRemoteStream: (stream: MediaStream | null) => void;
}

export const useWebRTCStore = create<WebRTCState>((set) => ({
  incomingCall: null,
  setIncomingCall: (incomingCall) => set({ incomingCall }),
  activeCallId: null,
  setActiveCallId: (activeCallId) => set({ activeCallId }),
  localStream: null,
  setLocalStream: (localStream) => set({ localStream }),
  remoteStream: null,
  setRemoteStream: (remoteStream) => set({ remoteStream }),
}));
