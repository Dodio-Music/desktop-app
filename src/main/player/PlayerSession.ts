import {BaseAudioSource} from "./BaseAudioSource.js";
import {BrowserWindow} from "electron";
import {QueueManager} from "./QueueManager.js";
import {Worker} from "node:worker_threads";
import {parseFlacStreamInfo, readFileRange} from "./FlacHelper.js";
import {IMsg, OutputDevice} from "./PlayerProcess.js";
import {SEGMENT_DURATION} from "../../shared/TrackInfo.js";
import {LocalAudioSource} from "./LocalAudioSource.js";
import {RemoteFlacSource} from "./RemoteFlacSource.js";
import {SourceType} from "../../shared/PlayerState.js";

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

        let pcmSab: SharedArrayBuffer;
        if (sourceType === "local") {
            const headerBuf = await readFileRange(pathOrUrl, 0, 65535);
            const {totalSamples, sampleRate} = parseFlacStreamInfo(headerBuf);
            const sampleRateConversion = devInfo.sampleRate / sampleRate;
            const totalFloatSamples = Math.ceil(Number(totalSamples) * devInfo.channels * sampleRateConversion);
            pcmSab = new SharedArrayBuffer(totalFloatSamples * Float32Array.BYTES_PER_ELEMENT);
        } else {
            const totalSamples = Math.ceil(duration * devInfo.sampleRate * devInfo.channels);
            pcmSab = new SharedArrayBuffer(totalSamples * Float32Array.BYTES_PER_ELEMENT);
        }

        const totalSegments = Math.ceil(duration / SEGMENT_DURATION);
        const segmentSab = new SharedArrayBuffer(totalSegments);

        this.cancelSource();

        const SourceClass = sourceType === "local" ? LocalAudioSource : RemoteFlacSource;
        const flacSource = new SourceClass(
            pathOrUrl,
            devInfo.channels,
            devInfo.sampleRate,
            duration,
            pcmSab,
            this.mainWindow,
            segmentSab
        );

        flacSource.once("waveform:data", (data) => this.setWaveformData(data));
        void flacSource.start();

        return {pcmSab, segmentSab, devInfo, flacSource, trackInfo: {pathOrUrl, duration, sourceType}};
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
            flacSource,
            segmentSab,
            pcmSab,
            devInfo,
            trackInfo
        } = await this.createTrackBuffers(pathOrUrl, duration, sourceType);
        this.setSources(flacSource, null);
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
        const {pcmSab, segmentSab, devInfo, flacSource, trackInfo} =
            await this.createTrackBuffers(pathOrUrl, duration, sourceType);

        this.preloadSource = flacSource;
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
