import {PlaylistPreviewDTO, ReleasePreviewDTO} from "../../../shared/Api";
import { MdDelete } from "react-icons/md";
import {RemoteSongEntry} from "../../../shared/TrackInfo";
import {IoAddOutline} from "react-icons/io5";
import {ContextAction} from "@renderer/contextMenus/menuHelper";
import toast from "react-hot-toast";
import {errorToString} from "@renderer/util/errorToString";

export const playlistActions: ContextAction<PlaylistPreviewDTO>[] = [
    {
        id: "delete-playlist",
        label: "Delete Playlist",
        icon: <MdDelete size={22}/>,
        visible: (entity, helpers) => entity.ownerUserName === helpers.username,
        onClick: async (entity, helpers) => {
            const ok = await helpers.confirm?.({
                title: "Delete Playlist?",
                body: <>Are you sure you want to delete playlist <strong>{entity.playlistName}</strong>?<br/>This action cannot be undone!</>,
            });
            if(!ok) return;

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
                body: <>Are you sure you want to delete release <strong>{entity.releaseName}</strong> by <strong>{entity.artists.join(", ")}</strong>?<br/>This action cannot be undone!</>,
            });
            if(!ok) return;

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
        label: "Add to Playlist",
        icon: <IoAddOutline size={22}/>,
        visible: () => true,
        onClick: () => {toast.success("Not implemented yet!")}
    }
];
