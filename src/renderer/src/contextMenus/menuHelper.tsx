import {ListItemIcon, ListItemText, MenuItem} from "@mui/material";
import {ReactNode} from "react";
import {PlaylistPreviewDTO, PlaylistRole, PlaylistUserDTO, ReleasePreviewDTO} from "../../../shared/Api";
import {playlistActions, playlistUserActions, releaseActions, songActions} from "@renderer/contextMenus/registry";
import {IRole} from "../../../main/web/Typing";
import {ConfirmFn} from "@renderer/hooks/useConfirm";
import {RemoteSongEntry} from "../../../shared/TrackInfo";
import AddToPlaylistMenu from "@renderer/components/SongList/AddToPlaylistMenu";

export type ContextEntity =
    | { type: "release"; data: ReleasePreviewDTO }
    | { type: "playlist"; data: PlaylistPreviewDTO }
    | { type: "song"; data: RemoteSongEntry }
    | { type: "playlistUser"; data: PlaylistUserDTO };

interface ContextRegistryEntry<T> {
    actions: ContextAction<T>[];
}

export interface ContextActionHelpers {
    confirm?: ConfirmFn;
    refetch?: () => void;
    role?: IRole;
    username?: string;

    view?: "playlist" | "release" | "library";
    playlistId?: number;
    currentUserPlaylistRole?: PlaylistRole;
}

const contextRegistry: {
    [K in ContextEntity["type"]]: ContextRegistryEntry<
        Extract<ContextEntity, { type: K }>["data"]>
} = {
    release: {actions: releaseActions},
    playlist: {actions: playlistActions},
    song: {actions: songActions},
    playlistUser: {actions: playlistUserActions}
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
    const filteredActions = actions.filter(a => a.visible?.(data, helpers) ?? true);
    if (filteredActions.length <= 0) {
        close();
        return <></>;
    }
    return filteredActions
        .map(action => {
            if (action.id === "add-to-playlist") {
                return (
                    <AddToPlaylistMenu
                        key={action.id}
                        song={data as RemoteSongEntry}
                        closeParentMenu={close}
                    />
                );
            }

            return (
                <MenuItem
                    key={action.id}
                    onClick={() => {
                        close();
                        action.onClick(data, helpers);
                    }}
                >
                    {action.icon && <ListItemIcon>{action.icon}</ListItemIcon>}
                    <ListItemText primary={action.label} sx={{paddingRight: "5px"}}/>
                </MenuItem>
            );
        });
}
