import type {ElectronAPI} from "@electron-toolkit/preload"
import type {ApiType, CustomWindowControls, IAPI} from "./index";

declare global {
    interface Window {
        electron: ElectronAPI & CustomWindowControls;
        api: ApiType & {
            onPlayerUpdate: (cb: (data: any) => void) => void;
        };
    }
}
