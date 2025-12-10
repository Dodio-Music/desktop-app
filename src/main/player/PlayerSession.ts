import {BaseAudioSource} from "./AudioSource/BaseAudioSource.js";
import {BrowserWindow} from "electron";
import {QueueManager} from "./QueueManager.js";
import {Worker} from "node:worker_threads";
import {IMsg, OutputDevice} from "./PlayerProcess.js";
import {AudioSourceFactory} from "./AudioSource/AudioSourceFactory.js";
import {BaseSongEntry, isLocalSong, isRemoteSong} from "../../shared/TrackInfo.js";
import {PlayerState, RepeatMode} from "../../shared/PlayerState.js";

export class PlayerSession {
    private source: BaseAudioSource | null = null;
    private preloadSource: BaseAudioSource | null = null;
    private track: BaseSongEntry | null = null;
    private preloadTrack: BaseSongEntry | null = null;
    private waveformMap = new Map<string, { peaks: number[] }>();
    private nextPreload = false;

    private currentStateSecond = 0;

    constructor(
        private readonly mainWindow: BrowserWindow,
        private readonly playerProcess: Worker,
        private readonly queue: QueueManager
    ) {
    }

    get id() {
        return this.track?.id ?? "";
    }

    get currentTime() {
        return this.currentStateSecond;
    }

    get isPreloading() {
        return this.nextPreload;
    }

    setWaveformData(data: { id: string, peaks: number[] }) {
        this.waveformMap.set(data.id, data);

        if (data.id === this.track?.id) {
            this.mainWindow.webContents.send("player:event", {
                type: "waveform-data",
                ...data
            });
        }
    }

    updateState(state: { currentTime: number }) {
        this.currentStateSecond = state.currentTime;
        this.mainWindow.webContents.send("player:update", state);
    }

    resetPreload() {
        this.nextPreload = false;
    }

    markPreloadStarted() {
        this.nextPreload = true;
    }

    setSources(main: BaseAudioSource | null, preload: BaseAudioSource | null) {
        this.source?.cancel();
        this.source = main;
        this.preloadSource = preload;
    }

    setTracks(main: BaseSongEntry | null, preload: BaseSongEntry | null) {
        this.track = main;
        this.preloadTrack = preload;
    }

    getSources() {
        return {currentSource: this.source, preloadSource: this.preloadSource};
    }

    getTracks() {
        return {currentTrack: this.track, preloadTrack: this.preloadTrack};
    }

    cancelSource() {
        this.source?.cancel();
    }

    getWaveformMap() {
        return this.waveformMap;
    }

    sendPendingData(duration: number) {
        const data: Partial<PlayerState> = {
            currentTrack: this.getTracks().currentTrack,
            duration,
            waitingForData: true,
            currentTime: 0,
            latency: 0,
            userPaused: false
        }
        this.mainWindow.webContents.send("player:event", {
            type: "pending-data",
            data
        });
    }

    async createTrackBuffers(track: BaseSongEntry) {
        const devInfo = await this.getDeviceInfoFromWorker();

        let url = "";
        if(isLocalSong(track)) {
            url = track.fullPath;
        } else if(isRemoteSong(track)) {
            const audio = track.sources.find(s => s.quality === "LOSSLESS");
            if(audio) url = audio.url;
        }

        const pathOrUrl = url;

        const {source, pcmSab, segmentSab, duration} = await AudioSourceFactory.create(
            track.id,
            pathOrUrl,
            track.type,
            devInfo,
            this.mainWindow
        );

        source.once("waveform:data", (data) => this.setWaveformData(data));

        source.once("fully-loaded", async() => {
            if(this.track?.id !== source.id) return;
            if(this.nextPreload) return;

            const nextTrack = this.queue.getNext();
            if(!nextTrack) return;

            this.markPreloadStarted();
            if(this.queue.getRepeatMode() !== RepeatMode.One) {
                await this.preloadNextTrack(nextTrack);
            }
        });

        void source.start();

        return {pcmSab, segmentSab, devInfo, source, duration};
    }

    private async getDeviceInfoFromWorker(): Promise<OutputDevice> {
        return new Promise((resolve, reject) => {
            const onMessage = (msg: IMsg<OutputDevice>) => {
                if (msg.type === "device-info") {
                    this.playerProcess.off("message", onMessage);
                    resolve(msg.payload);
                }
            };
            this.playerProcess.on("message", onMessage);
            this.playerProcess.postMessage({type: "get-init-device"});
            setTimeout(() => {
                this.playerProcess.off("message", onMessage);
                reject(new Error("Device info request timed out"));
            }, 2000);
        });
    }

    async loadTrack(track: BaseSongEntry) {
        this.playerProcess.postMessage({type: "set-updates", payload: false});

        this.track = track;
        this.preloadSource?.cancel();
        this.preloadSource = null;

        this.sendPendingData(this.track.duration);

        const {
            source,
            segmentSab,
            pcmSab,
            devInfo,
            duration
        } = await this.createTrackBuffers(track);
        this.setSources(source, null);

        this.playerProcess.postMessage({
            type: "load",
            payload: {
                pcmSab,
                devInfo,
                duration,
                segmentSab,
            }
        });
    };

    async preloadNextTrack(track: BaseSongEntry) {
        const {pcmSab, segmentSab, devInfo, source, duration} =
            await this.createTrackBuffers(track);

        this.preloadSource = source;
        this.preloadTrack = track;
        this.markPreloadStarted();

        this.playerProcess.postMessage({
            type: "load-next",
            payload: {
                pcmSab,
                id: track.id,
                duration,
                devInfo,
                segmentSab,
                sourceType: track.type
            }
        });
    }

    async previous() {
        const previous = this.queue.getPrevious();
        if (this.currentTime < 3 && previous !== null) {
            const previous = this.queue.previous();
            if (previous) await this.loadTrack(previous);
        } else {
            void this.source?.seek(0);
            this.playerProcess.postMessage({type: "seek", payload: 0});
        }
    }

    seek(time: number) {
        void this.source?.seek(time);
        this.playerProcess.postMessage({ type: "seek", payload: time });
    }
}
