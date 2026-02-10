import useFetchData from "@renderer/hooks/useFetchData";
import {ReleaseDTO} from "../../../../shared/Api";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import {useRef} from "react";
import {SongList} from "@renderer/components/SongList/SongList";
import {releaseToSongEntries} from "@renderer/util/parseBackendTracks";
import {remoteSongRowSlots} from "@renderer/components/SongList/ColumnConfig";
import s from "./ReleaseView.module.css";
import {formatTime} from "@renderer/util/timeUtils";
import classNames from "classnames";
import OpenableCover from "@renderer/components/OpenableCover/OpenableCover";
import {useRequiredParam} from "@renderer/hooks/useRequiredParam";

const ReleaseView = () => {
    const id = useRequiredParam("id");
    const scrollPageRef = useRef<HTMLDivElement>(null);

    const { data: release, loading, error } = useFetchData<ReleaseDTO>(`/release/${id}`);
    const songEntries = releaseToSongEntries(release);
    const albumLengthSeconds = release?.releaseTracks.map(r => r.track.duration).reduce((partialSum, a) => partialSum + a, 0) ?? 0;

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
                            </div>
                        </div>
                    </div>
                    <SongList
                        scrollElement={scrollPageRef}
                        songs={songEntries}
                        slots={remoteSongRowSlots}
                        gridTemplateColumns="30px 1fr 100px 250px"
                    />
                </>
            )}
        </div>
    );
};

export default ReleaseView;
