import s from "./HomePage.module.css"
import useFetchData from "@renderer/hooks/useFetchData";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import {useAuth} from "@renderer/hooks/reduxHooks";
import {ReleaseDTO} from "../../../../shared/Api";
import {releaseToSongEntries} from "@renderer/util/parseBackendTracks";

const HomePage = () => {
    const {data, loading, error} = useFetchData<ReleaseDTO[]>("/api/release/all");
    const {status} = useAuth();

    if(loading) return <LoadingPage/>;

    const onLoadFirstFromRelease = (release: ReleaseDTO) => {
        const releaseTracks = releaseToSongEntries(release);
        window.api.loadTrackRemote(releaseTracks[0]);
    }

    return (
        <div className={`pageWrapper ${s.wrapper}`}>
            <h1>New Releases</h1>
            {
                status !== "account" ?
                    <p>Only registered Dodio users can listen to online tracks!</p>
                    :
                    error || !data ?
                        <p>{error ?? "An unknown error occurred!"}</p>
                        :
                        <div className={s.releases}>
                            {data.map(t =>
                                <div key={t.releaseName} className={s.track} onClick={() => onLoadFirstFromRelease(t)}>
                                    <div className={s.coverWrapper}><img alt={"cover"} className={s.cover} src={`${t.coverArtUrl}?size=low`}/></div>
                                    <p className={`${s.title} ${s.link}`}>{t.releaseName}</p>
                                    <p className={`${s.artist} ${s.link}`}>{t.artists.join(", ")}</p>
                                </div>
                            )}
                        </div>
            }
        </div>
    );
};

export default HomePage;
