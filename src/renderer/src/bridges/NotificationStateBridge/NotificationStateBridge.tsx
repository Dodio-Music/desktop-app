import {useDispatch, useSelector} from "react-redux";
import {AppDispatch, RootState} from "@renderer/redux/store";
import {useEffect} from "react";
import {fetchNotificationState, resetNotifications} from "@renderer/redux/notificationsSlice";

const NotificationStateBridge = () => {
    const accountStatus = useSelector((state: RootState) => state.auth.info.status);
    const dispatch = useDispatch<AppDispatch>();

    useEffect(() => {
        if (accountStatus === "no_account") {
            dispatch(resetNotifications());
        } else {
            dispatch(fetchNotificationState());
        }
    }, [accountStatus, dispatch]);

    return null;
};

export default NotificationStateBridge;
