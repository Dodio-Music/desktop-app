export type NotificationEvent = {
    type: "PLAYLIST_INVITE";
    payload: string;
};

const notificationListeners = new Set<(e: NotificationEvent) => void>();

export function onNotification(cb: (e: NotificationEvent) => void) {
    notificationListeners.add(cb);
    return () => notificationListeners.delete(cb);
}

export function emitNotification(e: NotificationEvent) {
    notificationListeners.forEach(cb => cb(e));
}
