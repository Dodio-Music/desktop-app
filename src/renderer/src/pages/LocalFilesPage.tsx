import {useEffect, useState} from "react";

import s from "./LocalFilesPage.module.css";
import {secondsToTime} from "../util/timeUtils";
import {WiTime3} from "react-icons/wi";
import {FaPlay} from "react-icons/fa6";
import {MouseEvent} from "react";

export interface SongEntry {
    name: string;
    fullPath: string;
    title: string;
    artists: string[];
    album: string;
    track?: number;
    duration?: number;
    picture?: string;y
}

const LocalFilesPage = () => {
    const [songs, setSongs] = useState<SongEntry[]>([]);
    const [selectedRow, setSelectedRow] = useState<string | undefined>(undefined);

    const handleWrapperClick = () => {
        setSelectedRow(undefined);
    };

    const handleRowClick = (e: MouseEvent, name: string) => {
        e.stopPropagation();
        setSelectedRow(name);
    };

    useEffect(() => {
        (async () => {
            const folder = "C:/Tracks";
            const data = await window.api.listLocalSongs(folder);
            setSongs(data);
        })();
    }, []);

    const playSong = (path: string) => {
        window.api.loadTrack(path);
    }

    return (
        <>
            <div className={s.wrapper} onClick={handleWrapperClick}>
                <h1>Local Files</h1>
                <div className={s.songList}>
                    <div className={`${s.headRow} ${s.grid}`}>
                        <div className={s.trackColumn}>
                            <div className={s.numberHeaderWrapper}>
                                <p className={`${s.textRight}`}>#</p>
                            </div>
                            <p>Title</p>
                        </div>
                        <p>Album</p>
                        <p>Date added</p>
                        <p className={s.durationHeader}><WiTime3/></p>
                        <p></p>
                    </div>
                    <div className={s.divider}/>
                    {songs.map(((song, i) => (
                        <div key={song.fullPath} id={selectedRow === song.name ? s.activeRow : ""}
                             className={`${s.songRow} ${s.grid}`} onClick={(e) => handleRowClick(e, song.name)}>
                            <div className={s.trackColumn}>
                                <div className={s.trackNumberWrapper}>
                                    <p className={`${s.trackNumber}`}>{i + 1}</p>
                                    <button className={s.playButton} onClick={() => playSong(song.fullPath)}><FaPlay/>
                                    </button>
                                </div>
                                <div className={s.trackElement}>
                                    <div className={s.cover}>
                                        <img className={s.img} src={song.picture} alt={"cover"}/>
                                    </div>
                                    <div className={s.trackInfo}>
                                        <p className={`${s.trackTitle}`}>{song.title}</p>
                                        <p className={`${s.trackArtist}`}>{song.artists.map(((a, i) => <span
                                            key={a}><span
                                            className={s.link}>{a}</span>{i < song.artists.length - 1 ? ", " : ""}</span>))}</p>
                                    </div>
                                </div>
                            </div>
                            <a className={s.trackAlbum}>{song.album}</a>
                            <p></p>
                            <p className={s.trackDuration}>{secondsToTime(song.duration ?? 0)}</p>
                            <p></p>
                        </div>
                    )))}
                </div>
            </div>
        </>
    );
};

export default LocalFilesPage;
