import {Client, StompSubscription} from "@stomp/stompjs";
import {store} from "@renderer/redux/store";
import {
    applyPlaylistRoleUpdate,
    applyPlaylistSongUpdate,
    PlaylistSongUpdateEvent, PlaylistUpdateEvent
} from "@renderer/redux/playlistSlice";
import toast from "react-hot-toast";
import {toCapitalized} from "@renderer/util/playlistUtils";

let client: Client | null = null;
let activeT = "";

store.subscribe(async () => {
    const t = store.getState().auth.info.accessToken;
    if(t.length <= 0) return;

    if (activeT !== t || !client) {
        if(client) await client.deactivate();
        client = null;
        activeT = t;
        connectStomp();
    }
});

export function connectStomp() {
    if (client) return;

    client = new Client({
        brokerURL: `ws://localhost:8085/ws?t=${ store.getState().auth.info.accessToken}`,
        reconnectDelay: 5000,
        onConnect: () => {
            console.log("STOMP connected");
            subscribeToNotifications();
        },
        onStompError: (frame) => {
            console.error("STOMP error", frame.headers["message"]);
        },
    });

    client.activate();
}

let currentPlaylistSongsSub: StompSubscription | null = null;
let currentPlaylistDetailsSub: StompSubscription | null = null;
let currentNotificationSub: StompSubscription | null = null;

export function subscribeToPlaylistSongs(playlistId: number) {
    if (!client || !client.connected) return;

    currentPlaylistSongsSub?.unsubscribe();

    currentPlaylistSongsSub = client.subscribe(
        `/user/queue/playlist/songs`,
        (msg) => {
            const event: PlaylistSongUpdateEvent = JSON.parse(msg.body);

            if (event.playlistId === playlistId) {
                store.dispatch(applyPlaylistSongUpdate(event));
            }
        }
    );

    return currentPlaylistSongsSub;
}

export function subscribeToPlaylistDetails(playlistId: number) {
    if (!client || !client.connected) return;

    currentPlaylistDetailsSub?.unsubscribe();

    currentPlaylistDetailsSub = client.subscribe(
        `/user/queue/playlist/details`,
        (msg) => {
            const event: PlaylistUpdateEvent = JSON.parse(msg.body);

            if (event.playlistId === playlistId) {
                store.dispatch(applyPlaylistRoleUpdate(event.userRole));
                toast.success("The playlist owner just changed your member role to " + toCapitalized(event.userRole) + ".");
            }
        }
    );

    return currentPlaylistDetailsSub;
}

export function subscribeToNotifications() {
    if (!client || !client.connected) return;

    currentNotificationSub?.unsubscribe();

    currentNotificationSub = client.subscribe(
        `/user/queue/notifications`,
        (msg) => {
            emitNotification({
                type: "PLAYLIST_INVITE",
                payload: msg.body
            });
        }
    );

    return currentNotificationSub;
}

export type NotificationEvent = {
    type: "PLAYLIST_INVITE";
    payload: string;
};

const notificationListeners = new Set<(e: NotificationEvent) => void>();

export function onNotification(cb: (e: NotificationEvent) => void) {
    notificationListeners.add(cb);
    return () => notificationListeners.delete(cb);
}

function emitNotification(e: NotificationEvent) {
    notificationListeners.forEach(cb => cb(e));
}
