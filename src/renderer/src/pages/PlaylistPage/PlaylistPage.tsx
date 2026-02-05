import s from "./PlaylistPage.module.css";
import {useState} from "react";
import {FiPlus} from "react-icons/fi";
import {Tooltip} from "@mui/material";
import useFetchData from "@renderer/hooks/useFetchData";
import {PlaylistPreviewDTO} from "../../../../shared/Api";
import Card from "@renderer/components/Card/Card";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import dodo from "../../../../../resources/dodo_whiteondark_512.png";
import NothingFound from "@renderer/components/NothingFound/NothingFound";
import {renderEntityActions} from "@renderer/contextMenus/menuHelper";
import {useContextMenu} from "@renderer/hooks/useContextMenu";
import {useConfirm} from "@renderer/hooks/useConfirm";
import {useAuth} from "@renderer/hooks/reduxHooks";
import {useNavigate} from "react-router-dom";
import {ContextMenu} from "@renderer/contextMenus/ContextMenu";
import PlaylistInitPopup from "@renderer/components/Popup/CreatePlaylist/PlaylistInitPopup";
import FilterBar from "@renderer/components/FilterBar/FilterBar";

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
    const confirm = useConfirm();
    const ctx = useContextMenu();
    const authInfo = useAuth().info;

    const {
        data,
        loading,
        error,
        refetch
    } = useFetchData<PlaylistPreviewDTO[]>(`/playlist/library?include=${activeFilter}`);

    return (
        <>
            <div className={"pageWrapper pageWrapperFullHeight"}>
                <div className={s.topbar}>
                    <button className={s.create} onClick={() => setCreateOpen(true)}><Tooltip
                        title={"Create New Playlist"}><FiPlus size={26}/></Tooltip></button>
                    <FilterBar
                        options={filterOptions}
                        value={activeFilter}
                        onChange={setActiveFilter}
                    />
                </div>
                {error && <p>{error}</p>}
                {loading && !data && <LoadingPage/>}
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
                                      getArtists={c => [c.owner.displayName]}
                                      getCoverUrl={() => dodo}
                                      getTiledCovers={() => playlist.coverArtUrls.length > 0 ? playlist.coverArtUrls : undefined}
                                />
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
                    ctx.state && renderEntityActions(ctx.state.target, ctx.close, {
                        confirm,
                        refetch,
                        username: authInfo.username
                    })
                }
            </ContextMenu>

            <PlaylistInitPopup open={createOpen} close={() => setCreateOpen(false)} refetch={refetch}
                               title={"Create your Playlist"}
                               onSubmit={(data) => window.api.authRequest<string>("post", "/playlist", data)}
                               submitLabel={"Create Playlist"}/>
        </>
    );
};

export default PlaylistPage;
