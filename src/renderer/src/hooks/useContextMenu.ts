import {useState, MouseEvent} from "react";
import {ContextEntity} from "@renderer/contextMenus/menuHelper";

export type ContextMenuState = {
    target: ContextEntity;
    mouseX: number;
    mouseY: number;
} | null;

export type ContextMenuHandle = {
    state: ContextMenuState,
    open: (e: MouseEvent, target: ContextEntity) => void;
    close: () => void;
}

export function useContextMenu() {
    const [state, setState] = useState<ContextMenuState>(null);

    return {
        state,
        open(e: MouseEvent, target: ContextEntity) {
            e.preventDefault();
            setState({
                target,
                mouseX: e.clientX,
                mouseY: e.clientY
            });
        },
        close() {
            setState(null);
        }
    };
}
