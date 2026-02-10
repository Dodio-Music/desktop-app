import {defineConfig} from "electron-vite";
import react from "@vitejs/plugin-react";
import {resolve} from "node:path";
import {loadEnv} from "vite";


export default defineConfig(({mode}) => {
    const defined_envs = loadEnv(mode, process.cwd(), "DODIO_");
    const define_envs = Object.fromEntries(
        Object.entries(defined_envs).map(([k, v]) => [`process.env.${k}`, JSON.stringify(v)])
    );
    return {
        main: {
            build: {
                rollupOptions: {
                    output: {
                        format: "es"
                    }
                }
            },
            define: define_envs
        },
        preload: {
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
            plugins: [react()],
            define: define_envs
        },
        build: {
            rollupOptions: {
                external: [
                    "sharp"
                ]
            }
        }
    };
});
