import { parentPort } from "node:worker_threads";
import { Player } from "./Player";

if (!parentPort) {
    throw new Error("This file must be run as a Worker Thread");
}

const player = new Player();

player.onStateChange = (state) => {
    parentPort!.postMessage({ type: "state", payload: state });
};

parentPort.on("message",(msg) => {
    switch (msg.type) {
        case "load":
            player.load(msg.path);
            break;
        case "pauseOrResume":
            player.pauseOrResume();
            break;
        case "stop":
            player.stop();
            break;
    }
});
