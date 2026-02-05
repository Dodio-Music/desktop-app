import {PlaylistPreviewDTO, ReleasePreviewDTO} from "../../../shared/Api";
import {MdDelete, MdOutlinePlaylistAdd, MdOutlinePlaylistPlay} from "react-icons/md";
import {RemoteSongEntry} from "../../../shared/TrackInfo";
import {ContextAction} from "@renderer/contextMenus/menuHelper";
import toast from "react-hot-toast";
import {errorToString} from "@renderer/util/errorToString";

export const playlistActions: ContextAction<PlaylistPreviewDTO>[] = [
    {
        id: "delete-playlist",
        label: "Delete Playlist",
        icon: <MdDelete size={22}/>,
        visible: (entity, helpers) => entity.owner.username === helpers.username,
        onClick: async (entity, helpers) => {
            const ok = await helpers.confirm?.({
                title: "Delete Playlist?",
                body: <>Are you sure you want to delete playlist <strong>{entity.playlistName}</strong>?<br/>This action
                    cannot be undone!</>
            });
            if (!ok) return;

            const res = await window.api.authRequest<string>("delete", `/playlist/${entity.playlistId}`);

            if (res.type === "error") {
                toast.error(errorToString(res.error));
            } else {
                toast.success(res.value);
                helpers.refetch?.();
            }
        }
    }
];

export const releaseActions: ContextAction<ReleasePreviewDTO>[] = [
    {
        id: "delete-release",
        label: "Delete Release",
        icon: <MdDelete size={22}/>,
        visible: (_, helpers) => helpers.role === "ADMIN",
        onClick: (async (entity, helpers) => {
            const ok = await helpers.confirm?.({
                title: "Delete Release?",
                body: <>Are you sure you want to delete
                    release <strong>{entity.releaseName}</strong> by <strong>{entity.artists.join(", ")}</strong>?<br/>This
                    action cannot be undone!</>
            });
            if (!ok) return;

            const res = await window.api.authRequest<string>("delete", `/admin/release/${entity.releaseId}`);

            if (res.type === "error") {
                toast.error(errorToString(res.error));
            } else {
                toast.success(res.value);
                helpers.refetch?.();
            }
        })
    }
];

export const songActions: ContextAction<RemoteSongEntry>[] = [
    {
        id: "add-to-playlist",
        label: "",
        icon: <></>,
        visible: () => true,
        onClick: () => {}
    },
    {
        id: "remove-from-playlist",
        label: "Remove from playlist",
        icon: <MdDelete size={22} />,
        visible: (_, helpers) => helpers.view === "playlist",
        onClick: async (song, helpers) => {
            if (!helpers.playlistId) return;

            const res = await window.api.authRequest<string>("delete", `/playlist/${helpers.playlistId}/song/${song.id}`);

            if (res.type === "error") {
                toast.error(errorToString(res.error));
            }
        }
    },
    {
        id: "add-to-queue",
        label: "Add to queue",
        icon: <MdOutlinePlaylistAdd size={22} />,
        visible: () => true,
        onClick: (async () => {
            toast.error("Not implemented yet.")
        })
    },
    {
        id: "play-next",
        label: "Play next",
        icon: <MdOutlinePlaylistPlay size={22}/>,
        visible: () => true,
        onClick: (async () => {
            toast.error("Not implemented yet.")
        })
    }
];
