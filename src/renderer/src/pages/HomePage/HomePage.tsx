import s from "./HomePage.module.css"
import tracks from "../../dummy/SongTestData";

const HomePage = () => {
    return (
        <div className={`pageWrapper ${s.wrapper}`}>
            <h1>New Releases</h1>
            <div className={s.releases}>
                {tracks.map(t =>
                    <div key={t.title} className={s.track} onClick={() => window.api.loadTrackRemote(t)}>
                        <div className={s.coverWrapper}><img alt={"cover"} className={s.cover} src={t.cover}/></div>
                        <p className={`${s.title} ${s.link}`}>{t.album}</p>
                        <p className={`${s.artist} ${s.link}`}>{t.artist}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomePage;
