import s from "./HomePage.module.css";
import useFetchData from "@renderer/hooks/useFetchData";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import {ReleaseDTO, ReleasePreviewDTO} from "../../../../shared/Api";
import {releaseToSongEntries} from "@renderer/util/parseBackendTracks";
import {useNavigate} from "react-router-dom";
import {FaPause, FaPlay} from "react-icons/fa6";
import {MouseEvent, useState} from "react";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import {isRemoteSong} from "../../../../shared/TrackInfo";
import toast from "react-hot-toast";
import {useAuth} from "@renderer/hooks/reduxHooks";
import {ListItemIcon, ListItemText, Menu, MenuItem} from "@mui/material";
import Delete from "@mui/icons-material/Delete";

const HomePage = () => {
    const navigate = useNavigate();
    const {data, loading, error, refetch} = useFetchData<ReleasePreviewDTO[]>("/api/release/all");
    const [menuPos, setMenuPos] = useState<{ mouseX: number; mouseY: number } | null>(null);
    const [selectedRelease, setSelectedRelease] = useState<ReleasePreviewDTO | null>(null);
    const {currentTrack: track, userPaused} = useSelector((state: RootState) => state.nativePlayer);
    const role = useAuth().info.role;

    const handleContextMenu = (e: MouseEvent, release: ReleasePreviewDTO) => {
        e.preventDefault();
        e.stopPropagation();

        setSelectedRelease(release);
        setMenuPos({
            mouseX: e.clientX + 2,
            mouseY: e.clientY - 6,
        });
    };

    const handleDelete = async () => {
        if (!selectedRelease) return;

        const res = await window.api.authRequest("delete", `/admin/release/${selectedRelease.releaseId}`);

        if (res.type === "error") {
            toast.error(res.error.error);
        } else {
            toast.success("Release deleted");
            refetch();
        }

        closeMenu();
    };

    const closeMenu = () => {
        setMenuPos(null);
        setSelectedRelease(null);
    };

    if (loading) return <LoadingPage/>;

    const handleIconClick = async (e: MouseEvent, releasePrev: ReleasePreviewDTO) => {
        e.stopPropagation();
        if (track && isRemoteSong(track) && track.releaseId === releasePrev.releaseId) {
            window.api.pauseOrResume();
        } else {
            const req = await window.api.authRequest("get", `/api/release/${releasePrev.releaseId}`);
            if(req.type === "error") {
                toast.error("Couldn't load release!");
                return;
            }

            const releaseTracks = releaseToSongEntries(req.value as ReleaseDTO);
            window.api.loadTrackRemote(releaseTracks[0], releaseTracks);
        }
    };

    if (error || data === null) return <p className={"errorPage"}>{error ?? "Couldn't load homepage!"}</p>;

    return (
        <div className={`pageWrapper ${s.wrapper}`}>
            <h1>New Releases</h1>
            {
                error || !data ?
                    <p>{error ?? "An unknown error occurred!"}</p>
                    :
                    <div className={s.releases}>
                        {data.map(t =>
                            <div key={t.releaseName} className={s.release}
                                 onClick={() => navigate(`/release/${t.releaseId}`)}
                                 onContextMenu={(e) => handleContextMenu(e, t)}>
                                <div className={s.coverWrapper}>
                                    <img alt={"cover"} className={s.cover} src={`${t.coverArtUrl}?size=low`}/>
                                    <button className={s.play} onClick={(e) => handleIconClick(e, t)}>
                                        {track && isRemoteSong(track) && track.releaseId === t.releaseId && !userPaused ?
                                            <FaPause size={24} className={s.pauseIcon}/>
                                            :
                                            <FaPlay size={24} className={s.playIcon}/>
                                        }
                                    </button>
                                </div>
                                <p className={`${s.title} ${s.link}`}>{t.releaseName}</p>
                                <p className={`${s.artist} ${s.link}`}>{t.artists.join(", ")}</p>
                            </div>
                        )}
                    </div>
            }
            <Menu
                open={Boolean(menuPos)}
                onClose={closeMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    menuPos
                        ? { top: menuPos.mouseY, left: menuPos.mouseX }
                        : undefined
                }
            >
                {role === "ADMIN" && (
                    <MenuItem onClick={handleDelete}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                            <Delete sx={{color: "rgb(255,255,255)"}} fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                            primary="Delete release"
                            sx={{color: "rgb(255,255,255)"}}
                        />
                    </MenuItem>
                )}
            </Menu>
        </div>
    );
};

export default HomePage;
