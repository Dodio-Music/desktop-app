import { BrowserWindow } from "electron";
import {BaseSongEntry} from "../../shared/TrackInfo.js";

export type QueueContextType = "local" | "remote";

export interface QueueContext {
    type: QueueContextType;
    tracks: BaseSongEntry[];
    startIndex: number;
}

export class QueueManager {
    private userQueue: BaseSongEntry[] = [];
    private context: QueueContext | null = null;
    private current: BaseSongEntry | null = null;
    private window: BrowserWindow;

    constructor(mainWindow: BrowserWindow) {
        this.window = mainWindow;
    }

    getCurrent(): BaseSongEntry | null {
        return this.current;
    }

    getUserQueue(): BaseSongEntry[] {
        return [...this.userQueue];
    }

    getContextQueue(): BaseSongEntry[] {
        if (!this.context) return [];
        const { tracks, startIndex } = this.context;
        // all tracks after the current index
        return tracks.slice(startIndex + 1);
    }

    getNext(): BaseSongEntry | null {
        if(this.userQueue.length > 0) {
            return this.userQueue[0];
        }

        if(this.context) {
            const {tracks, startIndex} = this.context;
            if(startIndex + 1 < tracks.length) {
                return tracks[startIndex + 1];
            }
        }

        return null;
    }

    setContext(type: QueueContextType, tracks: BaseSongEntry[], startIndex: number) {
        this.context = { type, tracks, startIndex };
        this.current = tracks[startIndex];
        this.notifyUpdate();
    }

    addToUserQueue(song: BaseSongEntry) {
        this.userQueue.push(song);
        this.notifyUpdate();
    }

    next(): BaseSongEntry | null {
        let next: BaseSongEntry | null = null;

        if(this.userQueue.length > 0) {
            next = this.userQueue.shift()!;
        } else if(this.context) {
            const {startIndex, tracks} = this.context;
            if(startIndex + 1 < tracks.length) {
                this.context.startIndex++;
                next = tracks[this.context.startIndex];
            }
        }
        if (!next) {
            this.current = null;
            this.notifyUpdate();
            return null;
        }

        this.current = next;
        this.notifyUpdate();
        return next;
    }

    previous(): BaseSongEntry | null {
        if(!this.context) return null;
        const {tracks} = this.context;
        this.context.startIndex--;
        return tracks[this.context.startIndex];
    }

    clearUserQueue() {
        this.userQueue = [];
        this.notifyUpdate();
    }

    notifyUpdate() {
        if (!this.window.isDestroyed()) {
            this.window.webContents.send("player:queue-update", {
                current: this.current,
                userQueue: this.userQueue,
                contextQueue: this.getContextQueue(),
                sourceType: this.context?.type ?? null
            });
        }
    }
}
