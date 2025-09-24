import { parentPort } from "node:worker_threads";
import { PlayerEchogarden } from "./PlayerEchogarden.js";

const player = new PlayerEchogarden();

player.onStateChange = (state) => {
    parentPort?.postMessage({ type: "state", state });
};

parentPort?.on("message", async (msg) => {
    switch (msg.type) {
        case "init-buffer-source":
            await player.load(msg.meta);
            break;

        case "pcm-chunk":
            player.append(msg.chunk);
            break;

        case "pause-or-resume":
            player.pauseOrResume();
            break;

        case "pcm-end":
            break;
    }
});
