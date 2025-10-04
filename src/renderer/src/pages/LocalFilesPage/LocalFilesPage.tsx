import {useEffect, useState} from "react";

import s from "./LocalFilesPage.module.css";
import {secondsToTime} from "../../util/timeUtils";
import {WiTime3} from "react-icons/wi";
import {FaPlay} from "react-icons/fa6";
import {MouseEvent} from "react";
import {format} from "timeago.js";

export interface SongEntry {
    name: string;
    fullPath: string;
    title: string;
    artists: string[];
    album: string;
    track?: number;
    duration?: number;
    picture?: string;
    createdAt: Date;
}

const LocalFilesPage = () => {
        const [songs, setSongs] = useState<SongEntry[]>([]);
        const [error, setError] = useState("");
        const [selectedRow, setSelectedRow] = useState<string | undefined>(undefined);

        const handleWrapperClick = () => {
            setSelectedRow(undefined);
        };

        const handleRowClick = (e: MouseEvent, name: string) => {
            e.stopPropagation();
            setSelectedRow(name);
        };

        const handleDialog = () => {
            window.api.showLocalFilesDialog();
        }

        useEffect(() => {
            const handler = () => {
                (async() => {
                    const preferences = await window.api.getPreferences();
                    if(preferences.localFilesDir === undefined) {
                        setError("You haven't set a song directory yet!");
                        return;
                    }

                    const data = await window.api.listLocalSongs(preferences.localFilesDir);
                    if (data === null) {
                        setSongs([]);
                        setError(preferences.localFilesDir + " does not exist! Please set your local files directory again.");
                        return;
                    }
                    setSongs(data);
                    setError("");
                })();
            };
            handler();

            const unsub = window.api.onPreferencesUpdated(handler);

            return () => {
                unsub();
            }
        }, []);

        const playSong = (path: string) => {
            window.api.loadTrack(path);
        };

        return (
            <div className={"pageWrapper"} onClick={handleWrapperClick}>
                <h1>Local Files</h1>
                {error ?
                    <>
                        <p className={s.error}>{error}</p>
                        <button onClick={() => handleDialog()} className={s.dirButton}>Set Song Directory</button>
                    </>
                    :

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
                                        <button className={s.playButton} onClick={() => playSong(song.fullPath)}>
                                            <FaPlay/>
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
                                <p className={s.timestamp}>{format(song.createdAt)}</p>
                                <p className={s.trackDuration}>{secondsToTime(song.duration ?? 0)}</p>
                                <p></p>
                            </div>
                        )))}
                    </div>
                }
            </div>
        );
    }
;

export default LocalFilesPage;
