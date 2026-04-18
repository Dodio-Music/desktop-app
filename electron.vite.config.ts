import {defineConfig} from "electron-vite";
import react from "@vitejs/plugin-react";
import {resolve} from "node:path";
import fs from "node:fs";

function loadConfig(mode: string) {
    const path = resolve("config", `${mode}.json`);
    let config = {};
    if(fs.existsSync(path)) {
        config = JSON.parse(fs.readFileSync(path, "utf-8"));
    }
    return config;
}

export default defineConfig(({mode}) => {
    const config = loadConfig(mode);
    if(!Object.keys(config).length) console.error("Couldn't load json config!");
    const define_envs = Object.fromEntries(
        Object.entries(config).map(([k, v]) => [
            `process.env.DODIO_${k}`,
            JSON.stringify(v)
        ])
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
            define: {
                "import.meta.env.VITE_E2E": process.env.VITE_E2E == "true",
                ...define_envs
            }
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
