import {useNavigate} from "react-router-dom";
import {useEffect} from "react";
import toast from "react-hot-toast";
import s from "./RealtimeNotificationBridge.module.css";
import {IoClose} from "react-icons/io5";
import {useAppDispatch} from "@renderer/redux/store";
import {incrementUnread} from "@renderer/redux/notificationsSlice";
import {onNotification} from "@renderer/stomp/notifications";

const RealtimeNotificationBridge = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    useEffect(() => {
        const off = onNotification((e) => {
            if(e.type === "PLAYLIST_INVITE") {
                toast((t) => (
                    <div className={s.toastWrapper}>
                        <span>{e.payload}</span>
                        <button
                            className={s.toastClose}
                            onClick={(e) => {
                                e.stopPropagation();
                                toast.dismiss(t.id);
                            }}>
                            <IoClose />
                        </button>
                        <div className={s.wrap} onClick={() => {
                            navigate("/notifications");
                            toast.dismiss(t.id);
                        }}/>
                    </div>
                ), {
                    icon: "🔔",
                    position: "top-right",
                    style: {maxWidth: "500px"},
                    duration: 10000
                });
                dispatch(incrementUnread());
            }
        });

        return () => {
            off();
        };
    }, [navigate]);

    return null;
};

export default RealtimeNotificationBridge;
