import SettingsPage from "@renderer/pages/Settings/SettingsPage";
import AccountPage from "@renderer/pages/Settings/AccountPage";
import {useAuth} from "@renderer/hooks/reduxHooks";
import {useSearchParams} from "react-router-dom";

const OverallSettings = () => {
    const {info} = useAuth();

    const [searchParams] = useSearchParams();

    const tab = searchParams.get("tab");
    const showAccount = tab === "account";

    return (
        <>
            <SettingsPage></SettingsPage>

            {info.email && (
                <AccountPage scrollDown={showAccount}></AccountPage>
            )}
        </>
    );
};

export default OverallSettings;
