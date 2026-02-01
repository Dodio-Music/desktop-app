import s from "./PlaylistPage.module.css";
import {FormEvent, useEffect, useRef, useState} from "react";
import {FiPlus} from "react-icons/fi";
import {Tooltip} from "@mui/material";
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
import useErrorHandling from "@renderer/hooks/useErrorHandling";
import {renderEntityActions} from "@renderer/contextMenus/menuHelper";
import {useContextMenu} from "@renderer/hooks/useContextMenu";
import {useConfirm} from "@renderer/hooks/useConfirm";
import {useAuth} from "@renderer/hooks/reduxHooks";
import {useNavigate} from "react-router-dom";
import {ContextMenu} from "@renderer/contextMenus/ContextMenu";

type FilterOption = "" | "OWNED,INVITED" | "LIKED";
type FilterEntry = { type: FilterOption, label: string };
const filterOptions: FilterEntry[] = [
    {type: "", label: "All"},
    {type: "OWNED,INVITED", label: "Mine & Shared"},
    {type: "LIKED", label: "Liked"}
];

const PlaylistPage = () => {
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState<FilterOption>("");
    const [createOpen, setCreateOpen] = useState(false);
    const [playlistName, setPlaylistName] = useState<string>("");
    const [isPublic, setIsPublic] = useState(false);
    const playlistNameInputRef = useRef<HTMLInputElement>(null);
    const [creationRequestActive, setCreationRequestActive] = useState(false);
    const {setError, InvalidInputError, hasError} = useErrorHandling();
    const confirm = useConfirm();
    const ctx = useContextMenu();
    const authInfo = useAuth().info;

    const {
        data,
        loading,
        error,
        refetch
    } = useFetchData<PlaylistPreviewDTO[]>(`/playlist/library?include=${activeFilter}`);

    useEffect(() => {
        if (createOpen) {
            playlistNameInputRef.current?.focus();
        }
    }, [createOpen]);

    const onSubmitCreate = async (e: FormEvent) => {
        e.preventDefault();
        if (!playlistName || creationRequestActive) return;

        setCreationRequestActive(true);

        const res = await window.api.authRequest<string>("post", "/playlist", {playlistName, public: isPublic});
        if (res.type === "error") {
            if(res.error.error === "invalid-input") setError(res.error);
            else toast.error(errorToString(res.error));
        } else {
            setPlaylistName("");
            setIsPublic(false);
            setCreateOpen(false);
            toast.success(res.value);
            refetch();
        }

        setCreationRequestActive(false);
    };

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
                                      onClick={() => navigate(`/playlist/${playlist.playlistId}`)}
                                      isPlaying={false}
                                      onIconClick={() => {
                                      }}
                                      onContextMenu={(e, data) => ctx.open(e, {type: "playlist", data})}
                                      getTitle={p => p.playlistName}
                                      getCoverUrl={() => dodo}
                                      getArtists={c => [c.owner.displayName]}/>
                            )
                        }
                    </div>
                }
                {data && data.length <= 0 &&
                    <NothingFound text={"No playlists here yet. Start by creating one!"}/>
                }
            </div>

            <ContextMenu ctx={ctx}>
                {
                    ctx.state && renderEntityActions(ctx.state.target, ctx.close, {confirm, refetch, username: authInfo.username})
                }
            </ContextMenu>

            {/* CREATE PLAYLIST POPUP */}
            {<Popup
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                className={s.popup}
                as={"form"}
                onSubmit={onSubmitCreate}
            >
                <h1>Create your Playlist</h1>
                <div className={s.options}>
                    <div className={classNames(s.option, hasError("playlistName") && "error")}>
                        <label>Playlist Name</label>
                        <input ref={playlistNameInputRef} placeholder={"My Playlist #1"} className={s.nameInput} value={playlistName}
                               onChange={e => setPlaylistName(e.currentTarget.value)}/>
                        <InvalidInputError inputKey={"playlistName"}/>
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
