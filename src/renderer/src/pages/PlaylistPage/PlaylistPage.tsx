import s from "./PlaylistPage.module.css";
import {FormEvent, MouseEvent, useCallback, useState} from "react";
import {FiPlus} from "react-icons/fi";
import {ListItemIcon, ListItemText, Menu, MenuItem, Tooltip} from "@mui/material";
import Popup from "@renderer/components/Popup/Popup";
import Switch from "react-switch";
import {RiInformation2Fill} from "react-icons/ri";
import toast from "react-hot-toast";
import classNames from "classnames";
import {errorToString} from "@renderer/util/errorToString";
import useFetchData from "@renderer/hooks/useFetchData";
import {PlaylistPreviewDTO} from "../../../../shared/Api";
import Card from "@renderer/components/Card/Card";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import dodo from "../../../../../resources/dodo_whiteondark_512.png";
import NothingFound from "@renderer/components/NothingFound/NothingFound";
import { MdDelete } from "react-icons/md";

type FilterOption = "" | "OWNED,INVITED" | "LIKED";
type FilterEntry = { type: FilterOption, label: string };
const filterOptions: FilterEntry[] = [
    {type: "", label: "All"},
    {type: "OWNED,INVITED", label: "Mine & Shared"},
    {type: "LIKED", label: "Liked"}
];

const PlaylistPage = () => {
    const [activeFilter, setActiveFilter] = useState<FilterOption>("");
    const [createOpen, setCreateOpen] = useState(false);
    const [playlistName, setPlaylistName] = useState<string>("");
    const [isPublic, setIsPublic] = useState(false);
    const [creationRequestActive, setCreationRequestActive] = useState(false);
    const {
        data,
        loading,
        error,
        refetch
    } = useFetchData<PlaylistPreviewDTO[]>(`/playlist/library?include=${activeFilter}`);
    const [contextMenu, setContextMenu] = useState<{
        playlist: PlaylistPreviewDTO;
        mouseX: number;
        mouseY: number;
    } | null>(null);

    const onSubmitCreate = async (e: FormEvent) => {
        e.preventDefault();
        if (!playlistName || creationRequestActive) return;

        setCreationRequestActive(true);

        const res = await window.api.authRequest<string>("post", "/playlist", {playlistName, public: isPublic});
        if (res.type === "error") {
            toast.error(errorToString(res.error, {fallbackMessage: "Error while creating playlist!"}));
        } else {
            setPlaylistName("");
            setIsPublic(false);
            setCreateOpen(false);
            toast.success(res.value);
            refetch();
        }

        setCreationRequestActive(false);
    };

    const handleContextMenu = (e: MouseEvent, playlist: PlaylistPreviewDTO) => {
        e.preventDefault();
        e.stopPropagation();

        setContextMenu({
            playlist,
            mouseX: e.clientX + 2,
            mouseY: e.clientY - 6
        });
    };

    const handleContextMenuCb = useCallback(
        (e: MouseEvent, playlist: PlaylistPreviewDTO) => handleContextMenu(e, playlist),
        []
    );

    const handleDelete = async () => {
        if (!contextMenu) return;

        const res = await window.api.authRequest("delete", `/playlist/${contextMenu.playlist.playlistId}`);

        if (res.type === "error") {
            toast.error(errorToString(res.error));
        } else {
            toast.success("Playlist deleted");
            refetch();
        }

        closeMenu();
    };

    const closeMenu = () => setContextMenu(null);

    return (
        <>
            <div className={"pageWrapper pageWrapperFullHeight"}>
                <div className={s.topbar}>
                    <button className={s.create} onClick={() => setCreateOpen(true)}><Tooltip
                        title={"Create New Playlist"}><FiPlus size={26}/></Tooltip></button>
                    <div className={s.filterWrapper}>
                        {filterOptions.map(entry => {
                            return <div key={entry.type} onClick={() => setActiveFilter(entry.type)}
                                        className={entry.type === activeFilter ? s.filterActive : ""}>
                                <p>{entry.label}</p></div>;
                        })}
                    </div>
                </div>
                {error && <p>{error}</p>}
                {loading && <LoadingPage/>}
                {data && data.length > 0 &&
                    <div className={s.playlists}>
                        {
                            data.map(playlist =>
                                <Card key={playlist.playlistId}
                                      data={playlist}
                                      onClick={() => {
                                      }}
                                      isPlaying={false}
                                      onIconClick={() => {
                                      }}
                                      onContextMenu={handleContextMenuCb}
                                      getTitle={p => p.playlistName}
                                      getCoverUrl={() => dodo}
                                      getArtists={c => c.ownerDisplayName}/>
                            )
                        }
                    </div>
                }
                {data && data.length <= 0 &&
                    <NothingFound text={"You didn't like any playlists yet!"}/>
                }
            </div>

            <Menu
                open={Boolean(contextMenu)}
                onClose={closeMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu
                        ? {top: contextMenu.mouseY, left: contextMenu.mouseX}
                        : undefined
                }
            >
                <MenuItem onClick={handleDelete}>
                    <ListItemIcon>
                        <MdDelete color={"rgb(255,255,255)"} size={22}/>
                    </ListItemIcon>
                    <ListItemText
                        primary="Delete Playlist"
                        sx={{color: "rgb(255,255,255)"}}
                    />
                </MenuItem>
            </Menu>


            {<Popup
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                className={s.popup}
                as={"form"}
                onSubmit={onSubmitCreate}
            >
                <h1>Create your Playlist</h1>
                <div className={s.options}>
                    <div className={s.option}>
                        <label>Playlist Name</label>
                        <input placeholder={"My Playlist #1"} className={s.nameInput} value={playlistName}
                               onChange={e => setPlaylistName(e.currentTarget.value)}/>
                    </div>
                    <div className={s.option}>
                        <div className={s.horiz}>
                            <p>Public Playlist</p>
                            <Tooltip
                                title={"Public playlists can be discovered by anyone. Private playlists are restricted to invited members only."}>
                                <RiInformation2Fill className={s.info} size={22}/>
                            </Tooltip>
                            <Switch handleDiameter={20} width={46} onColor={"#2580e1"} offColor={"#535353"}
                                    height={22}
                                    checked={isPublic} onChange={(checked) => setIsPublic(checked)}/>
                        </div>
                    </div>
                    <p className={s.titleInfo}>(These can always be changed later.)</p>
                </div>
                <button disabled={!playlistName}
                        className={classNames(s.finalCreate, creationRequestActive && s.creating)}>Create Playlist
                </button>
            </Popup>}
        </>
    );
};

export default PlaylistPage;
