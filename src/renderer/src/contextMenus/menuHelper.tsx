import {ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import {ReactNode} from "react";
import {PlaylistPreviewDTO, ReleasePreviewDTO} from "../../../shared/Api";
import {playlistActions, releaseActions, songActions} from "@renderer/contextMenus/registry";
import {IRole} from "../../../main/web/Typing";
import {ConfirmFn} from "@renderer/hooks/useConfirm";
import {RemoteSongEntry} from "../../../shared/TrackInfo";

export type ContextEntity =
    | { type: "release"; data: ReleasePreviewDTO }
    | { type: "playlist"; data: PlaylistPreviewDTO }
    | { type: "song"; data: RemoteSongEntry};

interface ContextRegistryEntry<T> {
    actions: ContextAction<T>[];
}

export interface ContextActionHelpers {
    confirm?: ConfirmFn;
    refetch?: () => void;
    role?: IRole;
}

const contextRegistry: {
    [K in ContextEntity["type"]]: ContextRegistryEntry<
        Extract<ContextEntity, { type: K }>["data"]>
} = {
    release: { actions: releaseActions },
    playlist: { actions: playlistActions },
    song: {actions: songActions}
};

export interface ContextAction<T> {
    id: string;
    label: string;
    icon?: ReactNode;
    visible?: (
        entity: T,
        helpers: ContextActionHelpers
    ) => boolean;
    onClick: (
        entity: T,
        helpers: ContextActionHelpers
    ) => void | Promise<void>;
}

export function getContextActions(entity: ContextEntity) {
    return contextRegistry[entity.type].actions;
}

export function renderEntityActions(
    entity: ContextEntity,
    close: () => void,
    helpers: ContextActionHelpers
) {
    const actions = getContextActions(entity) as ContextAction<unknown>[];
    return renderActions(actions, entity.data, close, helpers);
}

export function renderActions<T>(actions: ContextAction<T>[], data: T, close: () => void, helpers: ContextActionHelpers) {
    return actions
        .filter(a => a.visible?.(data, helpers) ?? true)
        .map(action => (
        <MenuItem
            key={action.id}
            onClick={() => {
                close();
                action.onClick(data, helpers);
            }}
        >
            {action.icon && <ListItemIcon>{action.icon}</ListItemIcon>}
            <ListItemText primary={action.label}/>
        </MenuItem>
    ))
}
