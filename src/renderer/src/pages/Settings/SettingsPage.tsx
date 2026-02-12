import s from "./SettingsPage.module.css";
import {latencyPresets} from "../../../../shared/latencyPresets.js";

const SettingsPage = () => {

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
        </div>
    )
}

export default SettingsPage;
