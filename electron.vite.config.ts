import {defineConfig, externalizeDepsPlugin} from "electron-vite";
import react from "@vitejs/plugin-react";
import {resolve} from 'node:path'
import {loadEnv} from "vite";


export default defineConfig({
    main: ({mode}) => {
        const defined_envs = loadEnv(mode, process.cwd(), 'DODIO_');

        return {
            plugins: [externalizeDepsPlugin()],
            build: {
                rollupOptions: {
                    output: {
                        format: "es"
                    }
                }
            },
            define: Object.fromEntries(
                Object.entries(defined_envs).map(([k, v]) => [
                    `process.env.${k}`,
                    JSON.stringify(v)
                ])
            )
        }
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                output: {
                    format: "es"
                }
            }
        }
    },
    renderer: {
        resolve: {
            alias: {
                "@renderer": resolve("src/renderer/src")
            }
        },
        plugins: [react()]
    }
});
