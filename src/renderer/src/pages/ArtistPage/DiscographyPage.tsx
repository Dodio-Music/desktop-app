import {useRequiredParam} from "@renderer/hooks/useRequiredParam";
import useFetchData from "@renderer/hooks/useFetchData";
import {ArtistDiscographyDTO, ArtistDiscographyMode, ArtistDiscographySort, ReleaseDTO} from "../../../../shared/Api";
import {useCallback, useMemo, useRef, useState} from "react";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import OpenableCover from "@renderer/components/OpenableCover/OpenableCover";
import s from "./DiscographyPage.module.css";
import {generalPlural, toCapitalized} from "@renderer/util/playlistUtils";
import {SongList} from "@renderer/components/SongList/SongList";
import {artistDiscographySongRowSots, remoteSongRowSlots} from "@renderer/components/SongList/ColumnConfig";
import {releaseToSongEntries, releaseTrackDTOListToSongEntries} from "@renderer/util/parseBackendTracks";
import {FaPause, FaPlay} from "react-icons/fa6";
import {IoIosCheckmarkCircle} from "react-icons/io";
import {MdOutlineAddCircleOutline} from "react-icons/md";
import {OptionButton} from "@renderer/components/OptionBar/OptionButton";
import {likeRelease, unlikeRelease} from "@renderer/redux/likeSlice";
import toast from "react-hot-toast";
import {errorToString} from "@renderer/util/errorToString";
import {useAppDispatch, useAppSelector} from "@renderer/redux/store";
import so from "../../components/OptionBar/OptionBar.module.css";
import {useNavigate, useSearchParams} from "react-router-dom";
import {useLoadCollection} from "@renderer/hooks/useLoadCollection";
import FilterBar from "@renderer/components/FilterBar/FilterBar";

type SortFilterEntry = { type: ArtistDiscographySort, label: string };
type ModeFilterEntry = { type: ArtistDiscographyMode, label: string };
const sortFilterOptions: SortFilterEntry[] = [
    {type: "NEWEST", label: "Newest"},
    {type: "OLDEST", label: "Oldest"},
    {type: "POPULAR", label: "Popular"}
];
const modeFilterOptions: ModeFilterEntry[] = [
    {type: "RELEASE", label: "Release"},
    {type: "TRACK", label: "Track"}
];

const DiscographyPage = () => {
    const id = useRequiredParam("id");
    const scrollPageRef = useRef<HTMLDivElement>(null);
    const likes = useAppSelector(state => state.likeSlice.likedReleases);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const isLiked = (id: string) => !!likes[id];
    const track = useAppSelector(state => state.nativePlayer.currentTrack);
    const userPaused = useAppSelector(state => state.nativePlayer.userPaused);
    const loadCollection = useLoadCollection();

    const [searchParams] = useSearchParams();
    const defaultSort = searchParams.get("sort");
    const defaultMode = searchParams.get("mode");
    const [discographySort, setDiscographySort] = useState<ArtistDiscographySort>(defaultSort as ArtistDiscographySort ?? "NEWEST");
    const [discographyMode, setDiscographyMode] = useState<ArtistDiscographyMode>(defaultMode as ArtistDiscographyMode ?? "RELEASE");

    const {
        data: artistDiscography,
        loading,
        error
    } = useFetchData<ArtistDiscographyDTO>(`/artist/${id}/discography?mode=${discographyMode}&sort=${discographySort}`, false);

    const resultDiscographyMode = artistDiscography?.mode;

    const handleLikeRelease = useCallback(async (release: ReleaseDTO) => {
        if (!release) return;

        const isLiked = !!likes[release.releaseId ?? ""];

        const res = await window.api.authRequest<string>("put", "/like", {
            likeScope: "RELEASE",
            likedId: release.releaseId,
            liked: !isLiked
        });

        if (res.type !== "error") {
            if (!isLiked) {
                dispatch(likeRelease(release?.releaseId));
            } else {
                dispatch(unlikeRelease(release?.releaseId));
            }
        } else {
            toast.error(errorToString(res.error));
        }
    }, [likes, dispatch]);

    const trackEntries = useMemo(() => {
        if (!artistDiscography) return [];

        return releaseTrackDTOListToSongEntries(
            artistDiscography.releaseTracks,
            {
                type: "artist",
                id: artistDiscography.artist.artistId,
                url: `/artist/${artistDiscography.artist.artistId}/discography`,
                name: "Artist Tracks"
            }
        );
    }, [artistDiscography]);

    return (
        <div className="pageWrapper pageWrapperFullHeight" ref={scrollPageRef}>
            <div className={s.discographyHeader}>
                <h1>{artistDiscography?.artist.artistName ?? ""}</h1>
                <div className={s.discographyHeaderOptions}>
                    <FilterBar
                        options={modeFilterOptions}
                        value={discographyMode}
                        onChange={setDiscographyMode}
                    />
                    <FilterBar
                        options={sortFilterOptions}
                        value={discographySort}
                        onChange={setDiscographySort}
                    />
                </div>
            </div>

            {!artistDiscography && loading && <LoadingPage/>}

            {!loading && error && (
                <p className="errorPage">{error}</p>
            )}

            {resultDiscographyMode && (
                resultDiscographyMode === "RELEASE" ?
                    <div>
                        {artistDiscography.releases.map(r => {
                            const isPlaying = track?.context.type === "release" && track?.context.id === r.releaseId && !userPaused;

                            return (
                                <div key={r.releaseId} className={s.release}>
                                    <div className={s.releaseInfo}>
                                        <div className={s.cover}><OpenableCover
                                            thumbnailSrc={r.coverArtUrl + "?size=low"}
                                            fullSrc={r.coverArtUrl}/></div>
                                        <div className={s.releaseHeader}>
                                            <div>
                                                <h3 className={s.link}
                                                    onClick={() => navigate("/release/" + r.releaseId)}>{r.releaseName}</h3>
                                                <p>{toCapitalized(r.releaseType)} • {new Date(Date.parse(r.releaseDate)).getFullYear()} • {r.releaseTracks.length} Track{generalPlural(r.releaseTracks.length)}</p>
                                                <p>{`${r.streamCount} play${generalPlural(r.streamCount)}`}</p>
                                            </div>
                                            <div className={s.control}>
                                                <button className={s.play} onClick={(e) => {
                                                    e.stopPropagation();
                                                    void loadCollection(r.releaseId, "release");
                                                }}>
                                                    {isPlaying !== undefined && isPlaying ?
                                                        <FaPause size={22} className={s.pauseIcon}/> :
                                                        <FaPlay size={22} className={s.playIcon}/>}
                                                </button>
                                                <div className={so.optionBar}>
                                                    <OptionButton
                                                        tooltip={isLiked(r.releaseId) ? "Remove from Saved Albums" : "Save Album"}
                                                        onClick={() => handleLikeRelease(r)}>
                                                        {isLiked(r.releaseId) ?
                                                            <IoIosCheckmarkCircle
                                                                style={{
                                                                    transform: "scale(1.1)",
                                                                    color: "var(--color-text-primary)"
                                                                }}/>
                                                            :
                                                            <MdOutlineAddCircleOutline
                                                                style={{transform: "scale(1.1)"}}/>
                                                        }
                                                    </OptionButton>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <SongList songs={releaseToSongEntries(r)}
                                              slots={remoteSongRowSlots}
                                              scrollElement={scrollPageRef}
                                              gridTemplateColumns="30px 1fr 150px 300px"
                                              navigate={navigate}/>
                                </div>
                            );
                        })}
                    </div>
                    :
                    <SongList songs={trackEntries}
                              slots={artistDiscographySongRowSots}
                              scrollElement={scrollPageRef}
                              gridTemplateColumns="30px 3.5fr 2.5fr 6ch 1.5fr 140px"
                              navigate={navigate}/>
            )}
        </div>
    );
};

export default DiscographyPage;
