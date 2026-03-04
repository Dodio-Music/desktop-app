import s from "./SettingsPage.module.css";
import {latencyPresets} from "../../../../shared/latencyPresets.js";
import {themeOptions} from "../../../../shared/themeOptions";
import {setGlobalTheme} from "@renderer/redux/uiSlice";
import {useAppDispatch, useAppSelector} from "@renderer/redux/store";
import toast from "react-hot-toast";
import classNames from "classnames";
import {useEffect, useState} from "react";
import {UpdateStatus} from "../../../../shared/updaterApi";

const SettingsPage = () => {
    const dispatch = useAppDispatch();
    const theme = useAppSelector(state => state.uiSlice.theme);
    const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
    const [updateButtonEnabled, setUpdateButtonEnabled] = useState<boolean>(true);

    const handleThemeChange = async (themeName: string) => {
        const theme = themeOptions.find(t => t.name === themeName);
        if(!theme) return;

        dispatch(setGlobalTheme(theme));
        await window.api.setPreferences({ theme: theme.name });
        toast.success("Theme changed to " + theme.displayName + ".");
    };

    useEffect(() => {
        const fetchInitial = async () => {
            const status = await window.api.getUpdateStatus();
            setUpdateStatus(status);
        }
        void fetchInitial();

        const off = window.api.onUpdateStatusChange(status => {
            setUpdateStatus(status);
        });

        return () => off();
    }, []);

    const checkUpdates = async () => {
        setUpdateButtonEnabled(false);
        const check = await window.api.checkForUpdate();
        if(check) {
            if (check.isUpdateAvailable) toast.success("A new update is available!");
            else toast.success("No new updates available!");
        }
        setUpdateButtonEnabled(true);
    }

    return (
        <div className={`pageWrapper ${s.wrapper}`}>
            <h1>Settings</h1>
            <h2>Playback</h2>
            <div className={classNames(s.setting, s.settingsDisabled)}>
                <div>
                    <p className={s.label}>Audio Latency Preset</p>
                    <p className={s.info}>Determines how quickly audio reacts when you press play, seek, or change the volume.<br/>
                        Lower latency feels more responsive but may cause crackles on weak systems.</p>
                </div>
                <div>
                    <select disabled={true} className={s.latencyDropdown}>
                        {Object.entries(latencyPresets).map(([key, preset]) => (
                            <option key={key} value={key}>
                                {preset.label} [{preset.approxLatencyMs.toFixed(0)}ms]
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div className={classNames(s.setting, s.settingsDisabled)}>
                <div>
                    <p className={s.label}>Fade Duration</p>
                    <p className={s.info}>Controls how long fade-ins and fade-outs take when pausing or resuming.</p>
                </div>
            </div>
            <h2>Design / UI</h2>
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
            <h2>Updates</h2>
            <div className={s.setting}>
                {
                    updateStatus && (
                        <>
                            <div>
                                <p className={s.label}>{updateStatus.pending ? "Update available!" : "You're up to date!"}</p>
                                {updateStatus.pending && <p style={{color: "var(--color-accent)"}} className={s.info}>Latest version: <span style={{color: "var(--color-accent)"}} className={s.primary}>{updateStatus.pending.version}</span></p>}
                                <p className={s.info}>Current version: <span className={s.primary}>{updateStatus.currentVersion}</span>{!updateStatus.pending && " (latest)"}</p>
                            </div>
                            <div className={s.updateRight}>
                                {
                                    updateStatus.pending ?
                                        <button disabled={updateStatus.pending.status === "downloading"} className={classNames(s.check, s.install)} onClick={() => window.api.installUpdate()}>Install and Restart</button>
                                        :
                                        <button disabled={!updateButtonEnabled} className={s.check} onClick={checkUpdates}>Check for Updates</button>
                                }
                                {updateStatus.pending && updateStatus.pending.status === "downloading" && <p className={s.progress}>Downloading...</p>}
                            </div>
                        </>
                    )
                }
            </div>
        </div>
    );
}

export default SettingsPage;
