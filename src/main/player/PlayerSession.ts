import {BaseAudioSource} from "./BaseAudioSource.js";
import {BrowserWindow} from "electron";
import {QueueManager} from "./QueueManager.js";
import {Worker} from "node:worker_threads";
import {IMsg, OutputDevice} from "./PlayerProcess.js";
import {AudioSourceFactory} from "./AudioSourceFactory.js";
import {BaseSongEntry, isLocalSong, isRemoteSong} from "../../shared/TrackInfo.js";

export class PlayerSession {
    private source: BaseAudioSource | null = null;
    private preloadSource: BaseAudioSource | null = null;
    private track: BaseSongEntry | null = null;
    private preloadTrack: BaseSongEntry | null = null;
    private waveformData: { id: string, peaks: number[] } | null = null;
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
        this.waveformData = data;
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

    getWaveformData() {
        return this.waveformData;
    }

    async createTrackBuffers(track: BaseSongEntry) {
        const devInfo = await this.getDeviceInfoFromWorker();

        const pathOrUrl = isLocalSong(track) ? track.fullPath : isRemoteSong(track) ? track.sources[0].url : "";

        const {source, pcmSab, segmentSab, duration} = await AudioSourceFactory.create(
            track.id,
            pathOrUrl,
            track.type,
            devInfo,
            this.mainWindow
        )

        this.cancelSource();

        source.once("waveform:data", (data) => this.setWaveformData(data));
        void source.start();

        return {pcmSab, segmentSab, devInfo, source, duration, pathOrUrl};
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
        const {
            source,
            segmentSab,
            pcmSab,
            devInfo,
            duration,
            pathOrUrl
        } = await this.createTrackBuffers(track);
        this.setSources(source, null);
        this.track = track;
        this.preloadSource?.cancel();
        this.preloadSource = null;

        this.playerProcess.postMessage({
            type: "load",
            payload: {
                pcmSab,
                path: pathOrUrl,
                id: track.id,
                duration,
                devInfo,
                segmentSab,
                sourceType: track.type
            }
        });
    };

    async preloadNextTrack(track: BaseSongEntry) {
        const {pcmSab, segmentSab, devInfo, source, duration, pathOrUrl} =
            await this.createTrackBuffers(track);

        this.preloadSource = source;
        this.preloadTrack = track;
        this.markPreloadStarted();

        this.playerProcess.postMessage({
            type: "load-next",
            payload: {
                pcmSab,
                path: pathOrUrl,
                id: track.id,
                duration,
                devInfo,
                segmentSab,
                sourceType: track.type
            }
        });
    }

    async previous() {
        if (this.currentTime < 3) {
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
