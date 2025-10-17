import {useCallback, useEffect} from "react";
import {dodioShortcutStore} from "@renderer/zustand/dodioShortcutsStore";
import {playpackStore} from "@renderer/zustand/playbackStore";


export function useDodioShortcuts(){

    const handleKeyPress = useCallback((e: KeyboardEvent) => {
        console.log(e.code)
        const { pauseOrResumeKey, muteKey, increaseVolumeKey, decreaseVolumeKey } = dodioShortcutStore.getState();

        const {toggleMute, increaseVolume, decreaseVolume, volume} = playpackStore.getState();

        switch (e.code.toLowerCase()){
            case pauseOrResumeKey?.toLowerCase():
                e.preventDefault();
                window.api.pauseOrResume();
                break;

            case muteKey?.toLowerCase():
                e.preventDefault();
                toggleMute();
                break;

            case increaseVolumeKey?.toLowerCase():
                e.preventDefault();
                increaseVolume(volume);
                break;

            case decreaseVolumeKey?.toLowerCase():
                e.preventDefault();
                decreaseVolume(volume);
                break;
        }
    }, [])

    useEffect(() => {
        document.addEventListener("keydown", handleKeyPress)

        return () => {
            document.removeEventListener("keydown", handleKeyPress);
        }
    }, [handleKeyPress]);
}
