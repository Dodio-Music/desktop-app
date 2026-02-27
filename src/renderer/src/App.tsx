import "./assets/base.css";
import s from "./App.module.css";
import {Toaster} from "react-hot-toast";
import RealtimeNotificationBridge from "@renderer/bridges/RealtimeNotificationBridge/RealtimeNotificationBridge";
import ViewBrowser from "@renderer/layout/Routing/ViewBrowser";
import RootLayout from "@renderer/layout/Routing/RootLayout";
import NotificationStateBridge from "@renderer/bridges/NotificationStateBridge/NotificationStateBridge";
import LikeStateBridge from "@renderer/bridges/LikeStateBridge/LikeStateBridge";

function App() {
    return (
        <>
            <NotificationStateBridge/>
            <RealtimeNotificationBridge/>
            <LikeStateBridge/>

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
            <RootLayout>
                <ViewBrowser/>
            </RootLayout>
        </>
    );
}

export default App;
