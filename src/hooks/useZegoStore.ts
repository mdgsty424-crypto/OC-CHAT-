import { create } from 'zustand';

interface ZegoState {
  zp: any | null;
  setZp: (zp: any | null) => void;
  audioContext: AudioContext | null;
  setAudioContext: (ctx: AudioContext | null) => void;
  isAudioUnlocked: boolean;
  setIsAudioUnlocked: (unlocked: boolean) => void;
}

export const useZegoStore = create<ZegoState>((set) => ({
  zp: null,
  setZp: (zp) => set({ zp }),
  audioContext: null,
  setAudioContext: (audioContext) => set({ audioContext }),
  isAudioUnlocked: false,
  setIsAudioUnlocked: (isAudioUnlocked) => set({ isAudioUnlocked }),
}));
