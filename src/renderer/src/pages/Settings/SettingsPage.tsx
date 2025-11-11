import car from "./catSettings.gif"
import style from "./SettingsPage.module.css"

const SettingsPage = () => {
    return (
        <div className={style.cat}>
            <img src={car} style={{width: 100, height: 100}} alt=""/>
            <h3>Nothing to see here</h3>
        </div>
    );
};

export default SettingsPage;
