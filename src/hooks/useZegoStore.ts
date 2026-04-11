import { create } from 'zustand';

interface ZegoState {
  zp: any | null;
  setZp: (zp: any | null) => void;
  audioContext: AudioContext | null;
  setAudioContext: (ctx: AudioContext | null) => void;
  isAudioUnlocked: boolean;
  setIsAudioUnlocked: (unlocked: boolean) => void;
  incomingCall: {
    callID: string;
    caller: { userID: string; userName?: string };
    callType: number;
    callees: { userID: string; userName?: string }[];
    refuse: () => void;
    accept: () => void;
  } | null;
  setIncomingCall: (call: ZegoState['incomingCall']) => void;
  outgoingCall: {
    callID: string;
    callees: { userID: string; userName?: string }[];
    callType: number;
    cancel: () => void;
  } | null;
  setOutgoingCall: (call: ZegoState['outgoingCall']) => void;
}

export const useZegoStore = create<ZegoState>((set) => ({
  zp: null,
  setZp: (zp) => set({ zp }),
  audioContext: null,
  setAudioContext: (audioContext) => set({ audioContext }),
  isAudioUnlocked: false,
  setIsAudioUnlocked: (isAudioUnlocked) => set({ isAudioUnlocked }),
  incomingCall: null,
  setIncomingCall: (incomingCall) => set({ incomingCall }),
  outgoingCall: null,
  setOutgoingCall: (outgoingCall) => set({ outgoingCall }),
}));
