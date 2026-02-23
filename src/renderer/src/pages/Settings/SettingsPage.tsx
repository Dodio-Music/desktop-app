import s from "./SettingsPage.module.css";
import {latencyPresets} from "../../../../shared/latencyPresets.js";
import {themeOptions} from "../../../../shared/themeOptions";
import {setGlobalTheme} from "@renderer/redux/uiSlice";
import {useDispatch, useSelector} from "react-redux";
import {AppDispatch, RootState} from "@renderer/redux/store";
import toast from "react-hot-toast";

const SettingsPage = () => {
    const dispatch = useDispatch<AppDispatch>();
    const theme = useSelector((state: RootState) => state.uiSlice.theme);

    const handleThemeChange = async (themeName: string) => {
        const theme = themeOptions.find(t => t.name === themeName);
        if(!theme) return;

        dispatch(setGlobalTheme(theme));
        await window.api.setPreferences({ theme: theme.name });
        toast.success("Theme changed to " + theme.displayName + ".");
    };

    return (
        <div className={`pageWrapper ${s.wrapper}`}>
            <h1>Settings</h1>
            <h2>Playback</h2>
            <div className={s.setting}>
                <div>
                    <p className={s.label}>Audio Latency Preset</p>
                    <p className={s.info}>Determines how quickly audio reacts when you press play, seek, or change the volume.<br/>
                        Lower latency feels more responsive but may cause crackles on weak systems.</p>
                </div>
                <div>
                    <select className={s.latencyDropdown}>
                        {Object.entries(latencyPresets).map(([key, preset]) => (
                            <option key={key} value={key}>
                                {preset.label} [{preset.approxLatencyMs.toFixed(0)}ms]
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div className={s.setting}>
                <div>
                    <p className={s.label}>Fade Duration</p>
                    <p className={s.info}>Controls how long fade-ins and fade-outs take when pausing or resuming.</p>
                </div>
            </div>
            <div className={s.setting}>
                <div>
                    <p className={s.label}>Theme</p>
                    <p className={s.info}>Changes the accent color and visual highlights of the interface.</p>
                </div>
                <div>
                    <select className={s.latencyDropdown} value={theme.name}
                            onChange={(e) => handleThemeChange(e.currentTarget.value)}>
                        {themeOptions.map((theme, i) => (
                            <option key={i} value={theme.name}>
                                {theme.displayName}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    )
}

export default SettingsPage;
