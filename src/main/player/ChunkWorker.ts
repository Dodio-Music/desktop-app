import { parentPort } from "node:worker_threads";
import {AudioIO, IoStreamWrite} from "naudiodon";
import { PCMStore } from "./PCMStore.js";

type WorkerMessage =
    | { type: "init", options: { channels: number; sampleRate: number; bitDepth: 16|24|32 } }
    | { type: "pcm", chunk: Buffer }
    | { type: "pause" }
    | { type: "resume" }
    | { type: "stop" };

if (!parentPort) throw new Error("Must run in Worker");

let ai: IoStreamWrite | null = null;
const pcmStore = new PCMStore();
let cancelled = false;
let paused = false;

let bitDepth = 16;
let channels = 2;
let sampleRate = 44100;
let readOffset = 0;

const framesPerBuffer = 512 / 4; // tweak if needed
let chunkSize = framesPerBuffer * channels * (bitDepth/8);
let silentBuffer = Buffer.alloc(chunkSize);

async function chunkerLoop() {
    let c = 0;
    while (!cancelled) {
        c++;
        console.log(c);
        // Yield to event loop so stdout flushes & worker stays responsive
        await new Promise(r => setTimeout(r, 10))
        await new Promise(resolve => setImmediate(resolve));
    }

    parentPort!.postMessage({ type: "exited" });
}

const init = () => {
    ai = AudioIO({
        outOptions: {
            channelCount: channels,
            sampleFormat: bitDepth as 16 | 32 | 24,
            sampleRate: sampleRate,
            deviceId: -1,
            closeOnError: true
        }
    });
}

parentPort.on("message", (msg: WorkerMessage) => {
    switch(msg.type) {
        case "init":
            init()
            // bitDepth = msg.options.bitDepth;
            // channels = msg.options.channels;
            // sampleRate = msg.options.sampleRate;
            // chunkSize = framesPerBuffer * channels * (bitDepth/8);
            // silentBuffer = Buffer.alloc(chunkSize);

            // ai = AudioIO({
            //     outOptions: {
            //         channelCount: channels,
            //         sampleFormat: bitDepth as 16 | 32 | 24,
            //         sampleRate: sampleRate,
            //         deviceId: -1,
            //         closeOnError: true
            //     }
            // });
            // ai.start();
            chunkerLoop();
            break;

        case "pcm":
            pcmStore.append(msg.chunk);
            break;

        case "pause":
            paused = true;
            break;

        case "resume":
            paused = false;
            break;

        case "stop":
            cancelled = false;
            break;
    }
});
