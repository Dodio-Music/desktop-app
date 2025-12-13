import { app } from "electron";
import fs from "fs/promises";
import path from "path";
import { clearTimeout } from "node:timers";
import {IPreferences, IState} from "./preferences.js";

export class JsonStore<T extends IPreferences | IState> {
    private readonly path: string;
    private readonly tmpPath: string;
    private data: T;
    private readonly defaultData: T;
    private saveTimeout: NodeJS.Timeout | null = null;
    private initialized = false;

    constructor(fileName: string, defaultData: T) {
        this.path = path.join(app.getPath("userData"), fileName);
        this.tmpPath = this.path + ".tmp";
        this.defaultData = defaultData;
        this.data = { ...defaultData };
    }

    async load() {
        try {
            const raw = await fs.readFile(this.path, "utf-8");
            const parsed = JSON.parse(raw);
            this.data = pickKnownKeys(parsed, this.defaultData);
        } catch {
            this.data = { ...this.defaultData };
            await this.save();
        }
        this.initialized = true;
        return this.data;
    }

    get() {
        if (!this.initialized) throw new Error("Store not loaded yet");
        return this.data;
    }

    set(update: Partial<T>) {
        if (!this.initialized) throw new Error("Store not loaded yet");
        this.data = { ...this.data, ...update };
        this.scheduleSave();
        return this.data;
    }

    private async save() {
        const json = JSON.stringify(this.data, null, 2);
        await fs.writeFile(this.tmpPath, json, "utf-8");
        await fs.rename(this.tmpPath, this.path);
    }

    private scheduleSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.save(), 500);
    }
}

function pickKnownKeys<T extends object>(source: unknown, defaults: T): T {
    const result = { ...defaults };
    if (typeof source !== "object" || source === null) return result;
    for (const key of Object.keys(defaults) as (keyof T)[]) {
        if (key in source) {
            (result[key] as T[keyof T]) = (source as never)[key];
        }
    }
    return result;
}
