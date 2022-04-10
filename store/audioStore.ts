import create from 'zustand';
import { persist } from 'zustand/middleware';

type Volume = 'high' | 'off';

type AudioStore = {
  volume: Volume;
  setVolume: (volume: Volume) => void;
};

export const useAudioStore = create<AudioStore>(
  persist(
    (set, get) => ({
      volume: 'high',
      setVolume: (currentVolume: Volume) =>
        set({ volume: currentVolume === 'off' ? 'high' : 'off' }),
    }),
    {
      name: 'audio-settings', // unique name
      // getStorage: () => sessionStorage, // (optional) by default the 'localStorage' is used
    },
  ),
);
