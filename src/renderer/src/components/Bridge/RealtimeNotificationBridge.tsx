import {useNavigate} from "react-router-dom";
import {useEffect} from "react";
import {onNotification} from "@renderer/ws/stompClient";
import toast from "react-hot-toast";
import s from "./RealtimeNotificationBridge.module.css";
import {IoClose} from "react-icons/io5";

const RealtimeNotificationBridge = () => {
    const navigate = useNavigate();

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
            }
        });

        return () => {
            off();
        };
    }, [navigate]);

    return null;
};

export default RealtimeNotificationBridge;
