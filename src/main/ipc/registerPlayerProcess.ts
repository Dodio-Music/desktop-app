import {app, BrowserWindow, ipcMain} from "electron";
import {SEGMENT_DURATION, TrackInfo} from "../../shared/TrackInfo.js";
import {IMsg, OutputDevice} from "../player/PlayerProcess.js";
import playerProcessPath from "../player/PlayerProcess?modulePath";
import {Worker} from "node:worker_threads";
import {FLACStreamSource, WaveformMode} from "../player/FlacStreamSource.js";
import {SourceType} from "../../shared/PlayerState.js";
import {QueueManager} from "../player/QueueManager.js";
import {SongEntry} from "../songIndexer.js";
import {parseFlacStreamInfo, readFileRange} from "../player/FlacHelper.js";

export const registerPlayerProcessIPC = (mainWindow: BrowserWindow) => {
    const playerProcess = new Worker(playerProcessPath);
    const queue = new QueueManager(mainWindow);
    let nextPreload = false;
    let source: FLACStreamSource | null = null;
    let preloadSource: FLACStreamSource | null = null;
    let waveformData: {url: string, peaks: number[]} | null = null;
    let currentUrl: string;
    let currentStateSecond: number;

    playerProcess.on("message", async (msg) => {
        if(mainWindow.isDestroyed() || !mainWindow.webContents) return;

        switch(msg.type) {
            case "media-transition": {
                currentUrl = msg.state.currentTrackUrl;
                currentStateSecond = msg.state.currentTime;
                mainWindow.webContents.send("player:update", msg.state);
                mainWindow.webContents.send("player:event", {
                    type: "media-transition",
                    url: currentUrl,
                    ...(waveformData && waveformData.url === currentUrl && { waveformData }),
                });
                nextPreload = false;
                if(preloadSource) {
                    if(source) source.cancel();
                    source = preloadSource;
                    queue.next();
                }
                break;
            }
            case "player-state": {
                mainWindow.webContents.send("player:update", msg.state);

                currentStateSecond = msg.state.currentTime;
                const remaining =  msg.state.duration - msg.state.currentTime;
                if(remaining <= 5 && !nextPreload) {
                    const nextTrack = queue.getNext();
                    if(nextTrack) {
                        nextPreload = true;
                        await preloadNextTrack(nextTrack.fullPath, nextTrack.duration ?? 0, "local");
                    }
                }
                break;
            }
        }
    });

    app.on("before-quit", async (event) => {
        event.preventDefault();

        playerProcess.postMessage({type: "shutdown"});

        await new Promise<void>((resolve) => {
            playerProcess.once("exit", resolve);
            setTimeout(() => playerProcess.terminate(), 5000);
        });

        app.exit();
    });

    mainWindow.on("blur", () => playerProcess.postMessage({type: "focus-update", payload: false}));
    mainWindow.on("focus", () => playerProcess.postMessage({type: "focus-update", payload: true}));

    const loadTrack = async (pathOrUrl: string, duration: number, sourceType: SourceType) => {
        const {flacSource, segmentSab, pcmSab, devInfo, trackInfo} = await createTrackBuffers(pathOrUrl, duration, sourceType, mainWindow);
        source = flacSource;
        preloadSource?.cancel();
        preloadSource = null;
        currentUrl = pathOrUrl;

        playerProcess.postMessage({
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

    const preloadNextTrack = async (pathOrUrl: string, duration: number, sourceType: SourceType) => {
        const { pcmSab, segmentSab, devInfo, flacSource, trackInfo } =
            await createTrackBuffers(pathOrUrl, duration, sourceType, mainWindow);

        preloadSource = flacSource;

        nextPreload = true;

        playerProcess.postMessage({
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

    const createTrackBuffers = async(pathOrUrl: string, duration: number, sourceType: SourceType, mainWindow: BrowserWindow) => {
        const devInfo = await getDeviceInfoFromWorker();

        let pcmSab: SharedArrayBuffer;

        if(sourceType === "local") {
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

        if (source) source.cancel();
        const flacSource = new FLACStreamSource(
            pathOrUrl,
            devInfo.channels,
            devInfo.sampleRate,
            duration,
            pcmSab,
            mainWindow,
            sourceType,
            WaveformMode.LUFS,
            segmentSab
        );
        flacSource.once("waveform:data", (data) => {
            // try to send waveform data, stored as waveformData for later use in case current song doesn't match waveform's song
            waveformData = data;
            if(data.url === currentUrl) {
                mainWindow.webContents.send("player:event", {type: "waveform-data", ...waveformData});
            }
        });
        void flacSource.start();

        return {
            pcmSab,
            segmentSab,
            devInfo,
            flacSource,
            trackInfo: { pathOrUrl, duration, sourceType }
        };
    }

    const getDeviceInfoFromWorker = async (): Promise<OutputDevice> => {
        return new Promise((resolve, reject) => {
            const onMessage = (msg: IMsg<OutputDevice>) => {
                if (msg.type === "device-info") {
                    playerProcess.off("message", onMessage);
                    resolve(msg.payload);
                }
            };
            playerProcess.on("message", onMessage);

            playerProcess.postMessage({ type: "get-init-device" });

            setTimeout(() => {
                playerProcess.off("message", onMessage);
                reject(new Error("Device info request timed out"));
            }, 2000);
        });
    };

    ipcMain.handle("player:load-remote", async (_, track: TrackInfo) => {
        await loadTrack(track.manifest.url, track.duration, "remote");
    });

    ipcMain.handle("player:load-local", async (_, track: SongEntry, contextTracks: SongEntry[]) => {
        const startIndex = contextTracks.findIndex(t => t.fullPath === track.fullPath);
        queue.setContext("local", contextTracks, startIndex);

        await loadTrack(track.fullPath, track.duration ?? 0, "local");
    });

    ipcMain.handle("player:next", async () => {
        const next = queue.next();
        if(next) await loadTrack(next.fullPath, next.duration ?? 0, "local");
    });

    ipcMain.handle("player:previous", async () => {
        if(currentStateSecond < 3) {
            const previous = queue.previous();
            if(previous) await loadTrack(previous.fullPath, previous.duration ?? 0, "local");
        } else {
            if(source) void source.seek(0);
            playerProcess.postMessage({type: "seek", payload: 0});
        }
    });

    ipcMain.handle("player:set-volume", (_, volume: number) => {
        playerProcess.postMessage({type: "set-volume", payload: volume});
    });

    ipcMain.handle("player:pause-or-resume", () => {
        playerProcess.postMessage({type: "pause-or-resume"});
    });

    ipcMain.handle("player:seek", (_, time: number) => {
        if(source) void source.seek(time);
        playerProcess.postMessage({type: "seek", payload: time});
    });
};
