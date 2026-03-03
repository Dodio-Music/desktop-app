import { useAppDispatch, useAppSelector} from "@renderer/redux/store";
import {useEffect} from "react";
import {fetchNotificationState, resetNotifications} from "@renderer/redux/notificationsSlice";

const NotificationStateBridge = () => {
    const accountStatus = useAppSelector(state => state.auth.info.status);
    const dispatch = useAppDispatch();

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
