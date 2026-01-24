import s from "./HomePage.module.css";
import useFetchData from "@renderer/hooks/useFetchData";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import {ReleaseDTO, ReleasePreviewDTO} from "../../../../shared/Api";
import {releaseToSongEntries} from "@renderer/util/parseBackendTracks";
import {useNavigate} from "react-router-dom";
import {MouseEvent, useCallback, useEffect, useRef, useState} from "react";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import {isRemoteSong} from "../../../../shared/TrackInfo";
import toast from "react-hot-toast";
import {useAuth} from "@renderer/hooks/reduxHooks";
import {ListItemIcon, ListItemText, Menu, MenuItem} from "@mui/material";
import Card from "@renderer/components/Card/Card";
import {MdDelete} from "react-icons/md";

const HomePage = () => {
    const navigate = useNavigate();
    const {data, loading, error, refetch} = useFetchData<ReleasePreviewDTO[]>("/api/release/all");
    const [contextMenu, setContextMenu] = useState<{ release: ReleasePreviewDTO; mouseX: number; mouseY: number; } | null>(null);
    const track = useSelector((state: RootState) => state.nativePlayer.currentTrack);
    const userPaused = useSelector((state: RootState) => state.nativePlayer.userPaused);
    const role = useAuth().info.role;

    const trackRef = useRef(track);
    const userPausedRef = useRef(userPaused);

    useEffect(() => {
        trackRef.current = track;
    }, [track]);

    useEffect(() => {
        userPausedRef.current = userPaused;
    }, [userPaused]);

    const handleContextMenu = (e: MouseEvent, release: ReleasePreviewDTO) => {
        e.preventDefault();
        e.stopPropagation();

        setContextMenu({
            release,
            mouseX: e.clientX + 2,
            mouseY: e.clientY - 6
        });
    };

    const handleDelete = async () => {
        if (!contextMenu) return;

        const res = await window.api.authRequest("delete", `/admin/release/${contextMenu.release.releaseId}`);

        if (res.type === "error") {
            toast.error(res.error.error);
        } else {
            toast.success("Release deleted");
            refetch();
        }

        closeMenu();
    };

    const closeMenu = () => setContextMenu(null);

    const handleIconClick = useCallback(
        async (e: MouseEvent, releasePrev: ReleasePreviewDTO) => {
            e.stopPropagation();

            const track = trackRef.current;

            if (track && isRemoteSong(track) && track.releaseId === releasePrev.releaseId) {
                window.api.pauseOrResume();
                return;
            }

            const req = await window.api.authRequest("get", `/api/release/${releasePrev.releaseId}`);
            if (req.type === "error") {
                toast.error("Couldn't load release!");
                return;
            }

            const releaseTracks = releaseToSongEntries(req.value as ReleaseDTO);
            window.api.loadTrackRemote(releaseTracks[0], releaseTracks);
        },
        []
    );

    const handleClick = useCallback(
        (release: ReleasePreviewDTO) => navigate(`/release/${release.releaseId}`),
        [navigate]
    );

    const handleContextMenuCb = useCallback(
        (e: MouseEvent, release: ReleasePreviewDTO) => handleContextMenu(e, release),
        []
    );

    if (loading) return <LoadingPage/>;

    if (error || data === null) return <p className={"errorPage"}>{error ?? "Couldn't load homepage!"}</p>;

    return (
        <div className={`pageWrapper ${s.wrapper}`}>
            <h1>New Releases</h1>
            {
                error || !data ?
                    <p>{error ?? "An unknown error occurred!"}</p>
                    :
                    <div className={s.releases}>
                        {data.map(t => {
                            const isPlaying = track && isRemoteSong(track) && track.releaseId === t.releaseId && !userPaused;

                            return <Card
                                data={t}
                                onIconClick={handleIconClick}
                                key={t.releaseName}
                                isPlaying={isPlaying}
                                onClick={handleClick}
                                onContextMenu={handleContextMenuCb}
                                getTitle={(r) => r.releaseName}
                                getArtists={(r) => r.artists.join(", ")}
                                getCoverUrl={(r) => r.coverArtUrl}
                            />;
                        })}
                    </div>
            }
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
                {role === "ADMIN" && (
                    <MenuItem onClick={handleDelete}>
                        <ListItemIcon>
                            <MdDelete color={"rgb(255,255,255)"} size={22}/>
                        </ListItemIcon>
                        <ListItemText
                            primary="Delete Release"
                            sx={{color: "rgb(255,255,255)"}}
                        />
                    </MenuItem>
                )}
            </Menu>
        </div>
    );
};

export default HomePage;
