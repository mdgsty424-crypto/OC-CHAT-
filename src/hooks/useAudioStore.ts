import { create } from 'zustand';

interface AudioState {
  audioContext: AudioContext | null;
  setAudioContext: (ctx: AudioContext | null) => void;
  isAudioUnlocked: boolean;
  setIsAudioUnlocked: (unlocked: boolean) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  audioContext: null,
  setAudioContext: (audioContext) => set({ audioContext }),
  isAudioUnlocked: false,
  setIsAudioUnlocked: (isAudioUnlocked) => set({ isAudioUnlocked }),
}));
