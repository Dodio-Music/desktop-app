import {Client, StompSubscription} from "@stomp/stompjs";
import {store} from "@renderer/redux/store";
import {
    applyPlaylistSongUpdate, applyPlaylistUpdate,
    PlaylistSongUpdateEvent, PlaylistUpdateEvent
} from "@renderer/redux/playlistSlice";
import {emitNotification} from "@renderer/stomp/notifications";

const stompState = {
    client: null as Client | null,
    activeToken: "",
    isRefreshing: false,
    lastExpiry: null as number | null
};

const subscriptionIntent = {
    playlistSongs: null as { playlistId: number; isPublic: boolean } | null,
    playlistDetails: null as { playlistId: number; isPublic: boolean } | null,
    playlistMeta: null as {playlistId: number} | null
};

let currentPlaylistSongsSub: StompSubscription | null = null;
let currentPlaylistDetailsSub: StompSubscription | null = null;
let currentPlaylistMetaSub: StompSubscription | null = null;
let currentNotificationSub: StompSubscription | null = null;

function safeUnsubscribe(sub: StompSubscription | null) {
    try {
        sub?.unsubscribe();
    } catch { /* ignore */ }
}

store.subscribe(async () => {
    const {accessToken, accessTokenExpiry} = store.getState().auth.info;

    // user logs out
    if (!accessToken) {
        void resetStompState();
        return;
    }

    // schedule token expiry
    if (accessTokenExpiry) {
        const expiryTs = new Date(accessTokenExpiry).getTime();
        if (stompState.lastExpiry !== expiryTs) {
            stompState.lastExpiry = expiryTs;
            scheduleTokenRefresh(new Date(accessTokenExpiry));
        }
    }

    // new active token, restart stomp client
    if (stompState.activeToken !== accessToken) {
        stompState.activeToken = accessToken;

        void restartStomp();
    }
});

async function restartStomp() {
    await prepareForTokenRefresh();
    connectStomp();
}

async function resetStompState() {
    refreshTimeout && clearTimeout(refreshTimeout);
    refreshTimeout = null;

    stompState.lastExpiry = null;
    stompState.isRefreshing = false;
    stompState.activeToken = "";

    currentPlaylistSongsSub = null;
    currentPlaylistDetailsSub = null;
    currentNotificationSub = null;

    if (stompState.client) {
        void stompState.client.deactivate();
        stompState.client = null;
    }
}

async function prepareForTokenRefresh() {
    currentPlaylistSongsSub = null;
    currentPlaylistDetailsSub = null;
    currentNotificationSub = null;

    if (stompState.client) {
        await stompState.client.deactivate();
        stompState.client = null;
    }
}

let refreshTimeout: NodeJS.Timeout | null = null;

function scheduleTokenRefresh(expiry: Date) {
    if (refreshTimeout) clearTimeout(refreshTimeout);

    const refreshAt = expiry.getTime() - Date.now() - 60_000;

    if (refreshAt <= 0) {
        void refreshAccessToken();
        return;
    }

    refreshTimeout = setTimeout(() => {
        void refreshAccessToken();
    }, refreshAt);
}

async function refreshAccessToken() {
    if (stompState.isRefreshing) return;
    stompState.isRefreshing = true;

    stompState.lastExpiry = null;
    await prepareForTokenRefresh();
    stompState.isRefreshing = false;
    const res = await window.api.refreshAccessToken();
    if (res) {
        console.error("Error refreshing token for websocket connection!", res.error);
    }
}

export function connectStomp() {
    if (stompState.client || stompState.isRefreshing) return;
    const wsUrl = (process.env.DODIO_BACKEND_URL ?? "").replace(/^http/, "ws");

    stompState.client = new Client({
        brokerURL: `${wsUrl}/ws?t=${store.getState().auth.info.accessToken}`,
        reconnectDelay: 5000,
        onConnect: () => {
            console.log("STOMP reconnected");
            subscribeToNotifications();

            // resubscribe
            const { playlistSongs, playlistDetails } = subscriptionIntent;
            if (playlistSongs) subscribeToPlaylistSongs(playlistSongs.playlistId, playlistSongs.isPublic);
            if (playlistDetails) subscribeToPlaylistDetails(playlistDetails.playlistId, playlistDetails.isPublic);
        },
        onStompError: (frame) => {
            console.error("STOMP error", frame.headers["message"]);
        }
    });

    stompState.client.activate();
}

export function subscribeToPlaylistSongs(playlistId: number, isPublic: boolean) {
    subscriptionIntent.playlistSongs = { playlistId, isPublic };

    if (!stompState.client || !stompState.client.connected) return;

    safeUnsubscribe(currentPlaylistSongsSub);

    const destination = isPublic
        ? `/topic/playlist/${playlistId}/songs`
        : `/user/queue/playlist/songs`;

    currentPlaylistSongsSub = stompState.client.subscribe(destination, (msg) => {
        const event: PlaylistSongUpdateEvent = JSON.parse(msg.body);

        if (event.playlistId === playlistId) {
            store.dispatch(applyPlaylistSongUpdate(event));
        }
    });

    return () => safeUnsubscribe(currentPlaylistSongsSub);
}

export function subscribeToPlaylistDetails(playlistId: number, isPublic: boolean) {
    subscriptionIntent.playlistDetails = { playlistId, isPublic };

    if (!stompState.client || !stompState.client.connected) return;

    safeUnsubscribe(currentPlaylistDetailsSub);

    const destination = isPublic
        ? `/topic/playlist/${playlistId}/details`
        : `/user/queue/playlist/details`;

    currentPlaylistDetailsSub = stompState.client.subscribe(
        destination,
        (msg) => {
            const event: PlaylistUpdateEvent = JSON.parse(msg.body);

            if (event.playlistId === playlistId) {
                store.dispatch(applyPlaylistUpdate(event));
            }
        }
    );

    return () => safeUnsubscribe(currentPlaylistDetailsSub);
}

export function subscribeToPlaylistMeta(playlistId: number) {
    subscriptionIntent.playlistMeta = { playlistId };

    if (!stompState.client || !stompState.client.connected) return;

    safeUnsubscribe(currentPlaylistMetaSub);

    currentPlaylistMetaSub = stompState.client.subscribe(
        `/topic/playlist/${playlistId}/meta`,
        (msg) => {
            const event: PlaylistUpdateEvent = JSON.parse(msg.body);

            if (event.playlistId === playlistId) {
                store.dispatch(applyPlaylistUpdate(event));
            }
        }
    );

    return () => safeUnsubscribe(currentPlaylistDetailsSub);
}

export function resubscribeToPlaylist(playlistId: number, isPublic: boolean) {
    subscriptionIntent.playlistSongs = null;
    subscriptionIntent.playlistDetails = null;

    currentPlaylistSongsSub && currentPlaylistSongsSub.unsubscribe();
    currentPlaylistDetailsSub && currentPlaylistDetailsSub.unsubscribe();

    subscribeToPlaylistSongs(playlistId, isPublic);
    subscribeToPlaylistDetails(playlistId, isPublic);
}

export function subscribeToNotifications() {
    if (!stompState.client || !stompState.client.connected) return;

    safeUnsubscribe(currentNotificationSub);

    currentNotificationSub = stompState.client.subscribe(
        `/user/queue/notifications`,
        (msg) => {
            emitNotification({
                type: "PLAYLIST_INVITE",
                payload: msg.body
            });
        }
    );

    return () => safeUnsubscribe(currentNotificationSub);
}
