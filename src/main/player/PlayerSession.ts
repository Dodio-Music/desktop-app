import {BaseAudioSource} from "./BaseAudioSource.js";
import {BrowserWindow} from "electron";
import {QueueManager} from "./QueueManager.js";
import {Worker} from "node:worker_threads";
import {IMsg, OutputDevice} from "./PlayerProcess.js";
import {SourceType} from "../../shared/PlayerState.js";
import {AudioSourceFactory} from "./AudioSourceFactory.js";

export class PlayerSession {
    private source: BaseAudioSource | null = null;
    private preloadSource: BaseAudioSource | null = null;
    private waveformData: { url: string, peaks: number[] } | null = null;
    private nextPreload = false;
    private currentUrl = "";
    private currentStateSecond = 0;

    constructor(
        private readonly mainWindow: BrowserWindow,
        private readonly playerProcess: Worker,
        private readonly queue: QueueManager
    ) {
    }

    get url() {
        return this.currentUrl;
    }

    get currentTime() {
        return this.currentStateSecond;
    }

    get isPreloading() {
        return this.nextPreload;
    }

    setWaveformData(data: { url: string, peaks: number[] }) {
        this.waveformData = data;
        if (data.url === this.currentUrl) {
            this.mainWindow.webContents.send("player:event", {
                type: "waveform-data",
                ...data
            });
        }
    }

    updateState(state: { currentTime: number; duration: number; currentTrackUrl: string }) {
        this.currentStateSecond = state.currentTime;
        this.currentUrl = state.currentTrackUrl;
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

    getSources() {
        return {source: this.source, preload: this.preloadSource};
    }

    cancelSource() {
        this.source?.cancel();
    }

    getWaveformData() {
        return this.waveformData;
    }

    async createTrackBuffers(pathOrUrl: string, duration: number, sourceType: SourceType) {
        const devInfo = await this.getDeviceInfoFromWorker();

        const {source, pcmSab, segmentSab} = await AudioSourceFactory.create(
            pathOrUrl,
            sourceType,
            devInfo,
            this.mainWindow
        )

        this.cancelSource();

        source.once("waveform:data", (data) => this.setWaveformData(data));
        void source.start();

        return {pcmSab, segmentSab, devInfo, source, trackInfo: {pathOrUrl, duration, sourceType}};
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

    async loadTrack(pathOrUrl: string, duration: number, sourceType: SourceType) {
        const {
            source,
            segmentSab,
            pcmSab,
            devInfo,
            trackInfo
        } = await this.createTrackBuffers(pathOrUrl, duration, sourceType);
        this.setSources(source, null);
        this.currentUrl = pathOrUrl;
        this.preloadSource?.cancel();
        this.preloadSource = null;

        this.playerProcess.postMessage({
            type: "load",
            payload: {
                pcmSab,
                path: trackInfo.pathOrUrl,
                duration: trackInfo.duration,
                devInfo,
                segmentSab,
                sourceType: trackInfo.sourceType
            }
        });
    };

    async preloadNextTrack(pathOrUrl: string, duration: number, sourceType: SourceType) {
        const {pcmSab, segmentSab, devInfo, source, trackInfo} =
            await this.createTrackBuffers(pathOrUrl, duration, sourceType);

        this.preloadSource = source;
        this.markPreloadStarted();

        this.playerProcess.postMessage({
            type: "load-next",
            payload: {
                pcmSab,
                path: trackInfo.pathOrUrl,
                duration: trackInfo.duration,
                devInfo,
                segmentSab,
                sourceType: trackInfo.sourceType
            }
        });
    }

    async previous() {
        if (this.currentTime < 3) {
            const previous = this.queue.previous();
            if (previous) await this.loadTrack(previous.fullPath, previous.duration ?? 0, "local");
        } else {
            this.source?.seek(0);
            this.playerProcess.postMessage({type: "seek", payload: 0});
        }
    }

    seek(time: number) {
        this.source?.seek(time);
        this.playerProcess.postMessage({ type: "seek", payload: time });
    }
}
