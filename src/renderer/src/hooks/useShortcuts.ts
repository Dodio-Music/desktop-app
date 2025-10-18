import {useCallback, useEffect} from "react";
import {useDispatch, useSelector} from "react-redux";
import {AppDispatch, RootState} from "@renderer/redux/store";
import {decreaseVolume, increaseVolume, toggleMute} from "@renderer/redux/rendererPlayerSlice";


export function useShortcuts(){
    const dispatch = useDispatch<AppDispatch>();

    const preventDefaultKeys = (e: KeyboardEvent) => {
        const forbiddenKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "space"];
        if (forbiddenKeys.includes(e.code)) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    const {
        pauseOrResumeKey,
        muteKey,
        increaseVolumeKey,
        decreaseVolumeKey,
    } = useSelector((state: RootState) => state.shortcuts);

    const handleCustomShortcuts = useCallback((e: KeyboardEvent) => {
        switch (e.code.toLowerCase()){
            case pauseOrResumeKey?.toLowerCase():
                e.preventDefault();
                window.api.pauseOrResume();
                break;

            case muteKey?.toLowerCase():
                e.preventDefault();
                dispatch(toggleMute());
                break;

            case increaseVolumeKey?.toLowerCase():
                e.preventDefault();
                dispatch(increaseVolume());
                break;

            case decreaseVolumeKey?.toLowerCase():
                e.preventDefault();
                dispatch(decreaseVolume());
                break;
        }
    }, [dispatch,
        pauseOrResumeKey,
        muteKey,
        increaseVolumeKey,
        decreaseVolumeKey])

    useEffect(() => {
        document.addEventListener("keydown", preventDefaultKeys);
        document.addEventListener("keydown", handleCustomShortcuts)

        return () => {
            document.removeEventListener("keydown", preventDefaultKeys)
            document.removeEventListener("keydown", handleCustomShortcuts);
        }
    }, [handleCustomShortcuts]);
}
