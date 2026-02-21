import "./assets/base.css";
import s from "./App.module.css";
import {Toaster} from "react-hot-toast";
import {useEffect} from "react";
import RealtimeNotificationBridge from "@renderer/components/Bridge/RealtimeNotificationBridge";
import {useDispatch, useSelector} from "react-redux";
import {fetchNotificationState, resetNotifications} from "@renderer/redux/notificationsSlice";
import {AppDispatch, RootState} from "@renderer/redux/store";
import ViewBrowser from "@renderer/layout/Routing/ViewBrowser";

function App() {
    const username = useSelector((state: RootState) => state.auth.info.username);
    const initialized = useSelector((state: RootState) => state.notifications.initialized);
    const dispatch = useDispatch<AppDispatch>();

    useEffect(() => {
        if (!username) {
            dispatch(resetNotifications());
            return;
        }

        if (!initialized) {
            dispatch(fetchNotificationState());
        }
    }, [username]);

    return (
        <>
            <RealtimeNotificationBridge/>
            <Toaster
                position="bottom-center"
                containerStyle={{marginBottom: "100px", marginTop: "60px"}}
                toastOptions={{
                    style: {
                        backgroundColor: "rgb(50,50,50)",
                        color: "white"
                    }
                }}
                containerClassName={s.toast}
                reverseOrder={false}
            />
            <ViewBrowser/>
        </>
    );
}

export default App;
