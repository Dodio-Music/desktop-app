import SettingsPage from "@renderer/pages/Settings/SettingsPage";
import AccountPage from "@renderer/pages/Settings/AccountPage";
import {useAuth} from "@renderer/hooks/reduxHooks";
import {FC} from "react";

interface OverallSettingsProps{
    scrollDown: boolean
}

const OverallSettings: FC<OverallSettingsProps> = ({scrollDown}) => {
    const {info} = useAuth();

    return (
        <>
            <SettingsPage></SettingsPage>

            {info.email && (
                <AccountPage scrollDown={scrollDown}></AccountPage>
            )}
        </>
    );
};

export default OverallSettings;
