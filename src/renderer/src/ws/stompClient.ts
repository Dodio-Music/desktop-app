import {Client, StompSubscription} from "@stomp/stompjs";
import {store} from "@renderer/redux/store";
import {applyPlaylistUpdate, PlaylistUpdateEvent} from "@renderer/redux/playlistSlice";

let client: Client | null = null;

export function connectStomp() {
    if (client) return;

    client = new Client({
        brokerURL: "ws://localhost:8085/ws",
        reconnectDelay: 5000,
        onConnect: () => {
            console.log("STOMP connected");
        },
        onStompError: (frame) => {
            console.error("STOMP error", frame.headers["message"]);
        },
    });

    client.activate();
}

let currentPlaylistSub: StompSubscription | null = null;

export function subscribeToPlaylist(playlistId: number) {
    if (!client || !client.connected) return;

    currentPlaylistSub?.unsubscribe();

    currentPlaylistSub = client.subscribe(
        `/topic/playlists/${playlistId}`,
        (msg) => {
            const event: PlaylistUpdateEvent = JSON.parse(msg.body);
            store.dispatch(applyPlaylistUpdate(event));
        }
    );

    return currentPlaylistSub;
}
