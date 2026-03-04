export interface UpdateStatus {
    currentVersion: string;
    pending?: PendingUpdate;
}

export interface PendingUpdate {
    version: string;
    status: "downloading" | "downloaded";
}
