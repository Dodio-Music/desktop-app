import {useCallback, useEffect} from "react";
import {useDispatch, useSelector} from "react-redux";
import {AppDispatch, RootState} from "@renderer/redux/store";
import {decreaseVolume, increaseVolume, toggleMute} from "@renderer/redux/rendererPlayerSlice";


export function useShortcuts(){
    const dispatch = useDispatch<AppDispatch>();

    const preventDefaultKeys = (e: KeyboardEvent) => {
        const forbiddenKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "space"];
        if (!isTyping(e) && forbiddenKeys.includes(e.code)) {
            e.preventDefault();
        }
    };

    const {
        pauseOrResumeKey,
        muteKey,
        increaseVolumeKey,
        decreaseVolumeKey,
    } = useSelector((state: RootState) => state.shortcuts);

    const isTyping = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (!target) return false;

        if (target.isContentEditable) return true;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") return false;

        const input = target as HTMLInputElement;
        const textInputTypes = [
            "text", "email", "number", "password", "search",
            "tel", "url", "textarea",
        ];

        return textInputTypes.includes(input.type);
    }

    const handleCustomShortcuts = useCallback((e: KeyboardEvent) => {
        if(isTyping(e)) return;

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
