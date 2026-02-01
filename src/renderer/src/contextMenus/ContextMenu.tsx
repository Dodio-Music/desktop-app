import {ComponentProps, ReactNode} from "react";
import {Menu} from "@mui/material";
import {ContextMenuHandle} from "@renderer/hooks/useContextMenu";

interface ContextMenuProps {
    ctx: ContextMenuHandle;
    children: ReactNode;
    menuProps?: Partial<ComponentProps<typeof Menu>>;
}

export const ContextMenu = ({
                                ctx,
                                children,
                                menuProps
                            }: ContextMenuProps) => {
    const open = Boolean(ctx.state);
    const anchorPosition = ctx ? {top: ctx.state?.mouseY ?? 0, left: ctx.state?.mouseX ?? 0} : undefined;

    return (
        <Menu
            open={open}
            onClose={ctx.close}
            anchorReference="anchorPosition"
            anchorPosition={anchorPosition ?? undefined}
            disableAutoFocusItem
            disableRestoreFocus
            transitionDuration={0}
            {...menuProps}
        >
            {children}
        </Menu>
    );
};
