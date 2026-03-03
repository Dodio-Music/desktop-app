import useFetchData from "@renderer/hooks/useFetchData";
import {ReleaseDTO} from "../../../../shared/Api";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import {useCallback, useRef} from "react";
import {SongList} from "@renderer/components/SongList/SongList";
import {releaseToSongEntries} from "@renderer/util/parseBackendTracks";
import {remoteSongRowSlots} from "@renderer/components/SongList/ColumnConfig";
import s from "./ReleaseView.module.css";
import {formatTime} from "@renderer/util/timeUtils";
import classNames from "classnames";
import OpenableCover from "@renderer/components/OpenableCover/OpenableCover";
import {useRequiredParam} from "@renderer/hooks/useRequiredParam";
import {useAppDispatch, useAppSelector} from "@renderer/redux/store";
import so from "../../components/OptionBar/OptionBar.module.css";
import {OptionButton} from "@renderer/components/OptionBar/OptionButton";
import {MdOutlineAddCircleOutline} from "react-icons/md";
import {IoIosCheckmarkCircle} from "react-icons/io";
import {likeRelease, unlikeRelease} from "@renderer/redux/likeSlice";
import toast from "react-hot-toast";
import {errorToString} from "@renderer/util/errorToString";


const ReleaseView = () => {
    const id = useRequiredParam("id");
    const scrollPageRef = useRef<HTMLDivElement>(null);

    const { data: release, loading, error } = useFetchData<ReleaseDTO>(`/release/${id}`);
    const songEntries = releaseToSongEntries(release);
    const albumLengthSeconds = release?.releaseTracks.map(r => r.track.duration).reduce((partialSum, a) => partialSum + a, 0) ?? 0;
    const dispatch = useAppDispatch();
    const isLiked = useAppSelector(
        state => !!state.likeSlice.likedReleases[release?.releaseId ?? ""]
    );

    const handleLikeRelease = useCallback(async () => {
        if(!release?.releaseId) return;

        const res = await window.api.authRequest<string>("put", "/like", {likeScope: "RELEASE", likedId: release.releaseId, liked: !isLiked});

        if(res.type !== "error") {
            if(!isLiked) {
                dispatch(likeRelease(release?.releaseId));
                toast.success("Saved Album.");
            } else {
                dispatch(unlikeRelease(release?.releaseId));
                toast.success("Removed from Saved Albums.");
            }
        } else {
            toast.error(errorToString(res.error));
        }
    }, [release, isLiked, dispatch]);

    return (
        <div
            className={`pageWrapper pageWrapperFullHeight ${classNames(s.pageWrapper)}`}
            ref={scrollPageRef}
        >
            {loading && <LoadingPage />}

            {!loading && error && (
                <p className="errorPage">{error}</p>
            )}

            {!loading && release && (
                <>
                    <div className={s.headerWrapper}>
                        <div className={s.infoWrapper}>
                            <div className={s.cover}>
                                <OpenableCover thumbnailSrc={`${release.coverArtUrl}?size=low`} fullSrc={release.coverArtUrl + "?size=original"}/>
                            </div>
                            <div className={s.releaseInfo}>
                                <div>
                                    <p className={s.releaseTitle}>{release.releaseName}</p>
                                    <p className={s.artists}>{release.artists.map(((a, i) => <span key={a}><span className={s.link}>{a}</span>{i < release.artists.length - 1 ? ", " : ""}</span>))}</p>
                                </div>
                                <p className={s.tracksInfo}>{release.releaseTracks.length} Track{release.releaseTracks.length !== 1 && "s"} ({formatTime(albumLengthSeconds)})</p>
                                <div className={so.optionBar}>
                                    <OptionButton tooltip={isLiked ? "Remove from Saved Albums" : "Save Album"} onClick={() => handleLikeRelease()}>
                                        {isLiked ?
                                            <IoIosCheckmarkCircle style={{transform: "scale(1.1)", color: "var(--color-text-primary)"}} />
                                            :
                                            <MdOutlineAddCircleOutline style={{transform: "scale(1.1)"}} />
                                        }
                                    </OptionButton>
                                </div>
                            </div>
                        </div>
                    </div>
                    <SongList
                        scrollElement={scrollPageRef}
                        songs={songEntries}
                        slots={remoteSongRowSlots}
                        gridTemplateColumns="30px 1fr 100px 240px"
                    />
                </>
            )}
        </div>
    );
};

export default ReleaseView;
