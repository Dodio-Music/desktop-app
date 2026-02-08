import {Client, StompSubscription} from "@stomp/stompjs";
import {store} from "@renderer/redux/store";
import {applyPlaylistUpdate, PlaylistUpdateEvent} from "@renderer/redux/playlistSlice";

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

let currentPlaylistSub: StompSubscription | null = null;
let currentNotificationSub: StompSubscription | null = null;

export function subscribeToPlaylist(playlistId: number) {
    if (!client || !client.connected) return;

    currentPlaylistSub?.unsubscribe();

    currentPlaylistSub = client.subscribe(
        `/user/queue/playlists`,
        (msg) => {
            const event: PlaylistUpdateEvent = JSON.parse(msg.body);

            if (event.playlistId === playlistId) {
                store.dispatch(applyPlaylistUpdate(event));
            }
        }
    );

    return currentPlaylistSub;
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
