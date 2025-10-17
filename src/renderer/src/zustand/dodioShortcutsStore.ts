import {create} from "zustand/react";

interface dodioShortcutStore {
    pauseOrResumeKey : string | null;
    setPauseOrResumeKey : (pauseOrResumeKey: string) => void;

    muteKey : string | null;
    setMuteKey : (muteKey: string) => void;

    increaseVolumeKey: string | null;
    setIncreaseVolumeKey: (increaseVolumeKey: string) => void

    decreaseVolumeKey: string | null;
    setDecreaseVolumeKey: (decreaseVolumeKey: string) => void

}



export const dodioShortcutStore = create<dodioShortcutStore>((set)=> ({
    pauseOrResumeKey: "space",
    setPauseOrResumeKey: (pauseOrResumeKey) => set({ pauseOrResumeKey }),

    muteKey: "KeyM",
    setMuteKey: (muteKey) => set({ muteKey }),

    increaseVolumeKey: "ArrowUp",
    setIncreaseVolumeKey: (increaseVolumeKey) => set({ increaseVolumeKey }),

    decreaseVolumeKey: "ArrowDown",
    setDecreaseVolumeKey: (decreaseVolumeKey) => set({ decreaseVolumeKey })

}))
