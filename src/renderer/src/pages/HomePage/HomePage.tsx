import s from "./HomePage.module.css";
import useFetchData from "@renderer/hooks/useFetchData";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import {ReleaseDTO, ReleasePreviewDTO} from "../../../../shared/Api";
import {releaseToSongEntries} from "@renderer/util/parseBackendTracks";
import {useNavigate} from "react-router-dom";
import {MouseEvent, useCallback, useEffect, useRef} from "react";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import {isRemoteSong} from "../../../../shared/TrackInfo";
import toast from "react-hot-toast";
import {useAuth} from "@renderer/hooks/reduxHooks";
import {Menu} from "@mui/material";
import Card from "@renderer/components/Card/Card";
import {useContextMenu} from "@renderer/hooks/useContextMenu";
import {renderEntityActions} from "@renderer/contextMenus/menuHelper";
import {useConfirm} from "@renderer/hooks/useConfirm";

const HomePage = () => {
    const navigate = useNavigate();
    const {data, loading, error, refetch} = useFetchData<ReleasePreviewDTO[]>("/api/release/all");
    const confirm = useConfirm();
    const ctx = useContextMenu();
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
                                onContextMenu={(e, data) => ctx.open(e, {type: "release", data})}
                                getTitle={(r) => r.releaseName}
                                getArtists={(r) => r.artists.join(", ")}
                                getCoverUrl={(r) => r.coverArtUrl}
                            />;
                        })}
                    </div>
            }

            <Menu open={Boolean(ctx.state)}
                  onClose={ctx.close}
                  anchorReference={"anchorPosition"}
                  anchorPosition={ctx.state
                      ? {top: ctx.state.mouseY, left: ctx.state.mouseX}
                      : undefined}>
                {
                   ctx.state && renderEntityActions(ctx.state.target, ctx.close, {confirm, refetch, role})
                }
            </Menu>
        </div>
    );
};

export default HomePage;
