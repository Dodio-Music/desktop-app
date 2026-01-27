import {useState, MouseEvent} from "react";
import {ContextEntity} from "@renderer/contextMenus/menuHelper";

export function useContextMenu() {
    const [state, setState] = useState<{
        target: ContextEntity;
        mouseX: number;
        mouseY: number;
    } | null>(null);

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
