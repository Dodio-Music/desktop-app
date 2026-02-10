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

export function useContextMenu(closeCallback?: () => void) {
    const [state, setState] = useState<ContextMenuState>(null);

    return {
        state,
        open(e: MouseEvent, target: ContextEntity, pos?: {clientX: number, clientY: number}) {
            e.preventDefault();
            setState({
                target,
                mouseX: pos ? pos.clientX : e.clientX,
                mouseY: pos ? pos.clientY : e.clientY
            });
        },
        close() {
            setState(null);
            closeCallback?.();
        }
    };
}
