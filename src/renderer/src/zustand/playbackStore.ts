import {create} from "zustand/react";

interface PlayerState{
    volume: number;
    setVolume: (volume: number) => void;


    isMuted: boolean;
    toggleMute: () => void;
    setIsMuted: (muted: boolean) => void;

    increaseVolume: (currentVolume: number) => void;
    decreaseVolume: (currentVolume: number) => void;
}

export const playpackStore = create<PlayerState>((set)=> ({
    volume: 1,
    isMuted: false,

    setIsMuted: (isMuted) => set({isMuted}),

    setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
    toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

    // increase volume by 10, has to recive the old volume value
    increaseVolume: (currentVolume) => {
        set({ volume: Math.min(1, currentVolume + 0.1) })
    },
    // decrease volume by 10, has to recive the old volume value
    decreaseVolume: (currentVolume) => {
        set({ volume: Math.max(0, currentVolume - 0.1) })
    }
}))
