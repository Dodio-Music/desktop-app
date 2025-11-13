import s from "./HomePage.module.css"
import useFetchData from "@renderer/hooks/useFetchData";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import {useAuth} from "@renderer/hooks/reduxHooks";
import {RemoteSongEntry} from "../../../../shared/TrackInfo";
import {parseBackendTracks} from "../../util/parseBackendTracks";

const HomePage = () => {
    const {data, loading, error} = useFetchData<any>("/api/track/all");
    const {status} = useAuth();

    if(loading) return <LoadingPage/>;

    const tracks: RemoteSongEntry[] = data ? parseBackendTracks(data) : [];

    return (
        <div className={`pageWrapper ${s.wrapper}`}>
            <h1>New Releases</h1>
            {
                status !== "account" ?
                    <p>Only registered Dodio users can listen to online tracks!</p>
                    :
                    error ?
                        <p>{error}</p>
                        :
                        <div className={s.releases}>
                            {tracks.map(t =>
                                <div key={t.title} className={s.track} onClick={() => window.api.loadTrackRemote(t)}>
                                    <div className={s.coverWrapper}><img alt={"cover"} className={s.cover} src={t.picture}/></div>
                                    <p className={`${s.title} ${s.link}`}>{t.title}</p>
                                    <p className={`${s.artist} ${s.link}`}>{t.artists.join(", ")}</p>
                                </div>
                            )}
                        </div>
            }
        </div>
    );
};

export default HomePage;
