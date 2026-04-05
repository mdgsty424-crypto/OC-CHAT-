import { create } from 'zustand';

interface ZegoState {
  zp: any | null;
  setZp: (zp: any | null) => void;
}

export const useZegoStore = create<ZegoState>((set) => ({
  zp: null,
  setZp: (zp) => set({ zp }),
}));
