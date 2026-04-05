import { create } from 'zustand';

interface ZegoState {
  zp: any | null;
  setZp: (zp: any | null) => void;
  incomingCall: {
    callID: string;
    caller: { userID: string; userName?: string };
    callType: number;
    callees: { userID: string; userName?: string }[];
    refuse: () => void;
    accept: () => void;
  } | null;
  setIncomingCall: (call: ZegoState['incomingCall']) => void;
}

export const useZegoStore = create<ZegoState>((set) => ({
  zp: null,
  setZp: (zp) => set({ zp }),
  incomingCall: null,
  setIncomingCall: (incomingCall) => set({ incomingCall }),
}));
