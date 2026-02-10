import {BaseSongEntry} from "../../shared/TrackInfo.js";
import {BrowserWindow} from "electron";
import {PlayerEvent, RepeatMode} from "../../shared/PlayerState.js";
import {EventEmitter} from "node:events";
import {setPreferences} from "../preferences.js";

export interface PlaybackStrategy {
    getUpcoming(state: QueueState, count: number): BaseSongEntry[];
}

export type QueueContextType = "local" | "remote";

export interface QueueContext {
    type: QueueContextType;
    tracks: BaseSongEntry[];
    startIndex: number;
}

export interface QueueState {
    current: BaseSongEntry | null;
    userQueue: BaseSongEntry[];
    context: QueueContext | null;
}

export class RepeatAllStrategy implements PlaybackStrategy {
    getUpcoming(state: QueueState, count: number): BaseSongEntry[] {
        const result: BaseSongEntry[] = [];

        // user queue
        for (const song of state.userQueue) {
            if (result.length >= count) return result;
            result.push(song);
        }

        // context
        if (!state.context) return result;

        const { tracks, startIndex } = state.context;
        let tempIndex = startIndex;

        while (result.length < count) {
            tempIndex++;
            if (tempIndex < tracks.length) {
                result.push(tracks[tempIndex]);
            } else {
                // case: end of context -> return to top
                tempIndex = 0;
                if (tracks.length) result.push(tracks[0]);
            }
        }

        return result;
    }
}

export class RepeatOffStrategy implements PlaybackStrategy {
    getUpcoming(state: QueueState, count: number): BaseSongEntry[] {
        const result: BaseSongEntry[] = [];

        // user queue
        for (const song of state.userQueue) {
            if (result.length >= count) return result;
            result.push(song);
        }

        // context
        if (!state.context) return result;

        const { tracks, startIndex } = state.context;
        let tempIndex = startIndex;

        while (result.length < count) {
            tempIndex++;

            if (tempIndex < tracks.length) {
                result.push(tracks[tempIndex]);
            } else {
                break;
            }
        }
        return result;
    }
}

function advanceState(state: QueueState, next: BaseSongEntry) {
    if (state.userQueue.length && state.userQueue[0] === next) {
        state.userQueue.shift();
        state.current = next;
        return;
    }

    if (state.context) {
        const { tracks } = state.context;
        const index = tracks.findIndex(t => t.id === next.id);

        if (index !== -1) {
            state.context.startIndex = index;
            state.current = next;
        }
    }
}

function rewindState(state: QueueState, strategy: PlaybackStrategy): BaseSongEntry | null {
    if (!state.context || !state.current) return null;

    const { tracks, startIndex } = state.context;

    const prevIndex = startIndex - 1;

    if (prevIndex >= 0) {
        state.context.startIndex = prevIndex;
        const prev = tracks[prevIndex];
        state.current = prev;
        return prev;
    }


    // repeat all -> backwards on first song: go to last
    if (strategy instanceof RepeatAllStrategy) {
        const lastIndex = tracks.length - 1;
        if (lastIndex >= 0) {
            state.context.startIndex = lastIndex;
            const prev = tracks[lastIndex];
            state.current = prev;
            return prev;
        }
        return null;
    }

    // repeat off / repeat one
    return null;
}


export class QueueManager extends EventEmitter {
    private state: QueueState = {current: null, userQueue: [], context: null};
    private strategy!: PlaybackStrategy;
    private window: BrowserWindow;
    private repeatMode!: RepeatMode;

    constructor(win: BrowserWindow, initialRepeatMode: RepeatMode = RepeatMode.All) {
        super();
        this.window = win;
        this.setRepeatMode(initialRepeatMode);
    }

    private strategyFromRepeatMode(mode: RepeatMode): PlaybackStrategy {
        switch (mode) {
            case RepeatMode.Off:
                return new RepeatOffStrategy();
            case RepeatMode.All:
            case RepeatMode.One:
            default:
                return new RepeatAllStrategy();
        }
    }

    setRepeatMode(mode: RepeatMode) {
        this.repeatMode = mode;
        this.strategy = this.strategyFromRepeatMode(mode);
        setPreferences({repeatMode: this.repeatMode});
        this.emit("repeat-mode", this.repeatMode);
        this.notifyNextTrack();
        this.notifyState("repeat-mode", {repeatMode: this.repeatMode});
    }

    getRepeatMode(): RepeatMode {
        return this.repeatMode;
    }

    setContext(type: QueueContextType, tracks: BaseSongEntry[], startIndex: number) {
        this.state.context = { type, tracks, startIndex };
        this.state.current = tracks[startIndex];
        this.notifyNextTrack();
        this.notifyQueueState();
    }

    addToUserQueue(song: BaseSongEntry) {
        this.state.userQueue.push(song);
        this.notifyQueueState();
        this.notifyNextTrack();
    }

    next(): BaseSongEntry | null {
        const next = this.getNext();

        if (!next) {
            this.state.current = null;
            this.notifyQueueState();
            return null;
        }

        advanceState(this.state, next);
        this.notifyQueueState();
        this.notifyNextTrack();
        return next;
    }

    previous(): BaseSongEntry | null {
        const prev = rewindState(this.state, this.strategy);
        this.notifyQueueState();
        this.notifyNextTrack();
        return prev;
    }

    getNext(): BaseSongEntry | null  {
        return this.strategy.getUpcoming(this.state, 1)[0] ?? null;
    }

    getPrevious(): BaseSongEntry | null {
        if (!this.state.context || !this.state.current) return null;
        const { tracks, startIndex } = this.state.context;
        const prevIndex = startIndex - 1;

        if (prevIndex >= 0) {
            return tracks[prevIndex];
        }

        // repeat all
        if (this.strategy instanceof RepeatAllStrategy) {
            const lastIndex = tracks.length - 1;
            return lastIndex >= 0 ? tracks[lastIndex] : null;
        }

        return null;
    }

    cycleRepeatMode(dir: "forward" | "backward") {
        const repeatModes = Object.values(RepeatMode);
        const idx = repeatModes.indexOf(this.repeatMode);
        const step = dir === "forward" ? 1 : -1;
        const nextIdx = (idx + step + repeatModes.length) % repeatModes.length;
        this.setRepeatMode(repeatModes[nextIdx]);
    }

    getUpcoming(count: number) {
        return this.strategy.getUpcoming(this.state, count);
    }

    getInitialRedux() {
        return {repeatMode: this.repeatMode};
    }

    private notifyNextTrack() {
        const next = this.getNext();
        this.emit("next-track", next);
    }

    notifyState(type: PlayerEvent["type"], payload: object) {
        if(!this.window.isDestroyed()) {
            this.window.webContents.send("player:event", {type, ...payload});
        }
    }

    notifyQueueState() {
        if (!this.window.isDestroyed()) {
            this.window.webContents.send("player:queue-update", {
                current: this.state.current,
                userQueue: this.state.userQueue,
                contextQueue:
                    this.state.context?.tracks.slice(this.state.context.startIndex + 1) ?? [],
                sourceType: this.state.context?.type ?? null,
            });
        }
    }
}
