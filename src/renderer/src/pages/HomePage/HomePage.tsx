import s from "./HomePage.module.css"
// import tracks from "../../dummy/SongTestData";
import useFetchData from "@renderer/hooks/useFetchData";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import {useAuth} from "@renderer/hooks/reduxHooks";

const HomePage = () => {
    const {data, loading, error} = useFetchData<string>("/api/test");
    const {status} = useAuth();

    if(loading) return <LoadingPage/>;

    return (
        <div className={`pageWrapper ${s.wrapper}`}>
            <h1>New Releases</h1>
            {
                status !== "account" ?
                    <p>Only Dodio users can listen to online tracks!</p>
                    :
                    error ?
                        <p>{error}</p>
                        :
                        <div className={s.releases}>
                            {data}
                        </div>
            }
        </div>
    );
};

// {tracks.map(t =>
//     <div key={t.title} className={s.track} onClick={() => window.api.loadTrackRemote(t)}>
//         <div className={s.coverWrapper}><img alt={"cover"} className={s.cover} src={t.picture}/></div>
//         <p className={`${s.title} ${s.link}`}>{t.album}</p>
//         <p className={`${s.artist} ${s.link}`}>{t.artists.join(", ")}</p>
//     </div>
// )}

export default HomePage;
