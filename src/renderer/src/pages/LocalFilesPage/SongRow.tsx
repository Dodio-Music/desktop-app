import {FaPlay, FaPause} from "react-icons/fa6";
import {format} from "timeago.js";
import s from "./LocalFilesPage.module.css";
import {secondsToTime} from "../../util/timeUtils";
import {SongEntry} from "@renderer/pages/LocalFilesPage/LocalFilesPage";
import classNames from "classnames";

interface RowProps {
    index: number,
    song: SongEntry,
    selectedRow?: string;
    setSelectedRow: (name?: string) => void;
    currentTrack: string | null;
    userPaused: boolean;
    pauseOrLoadSong: (song: SongEntry) => void;
}

export const SongRow = ({
                            index,
                            song,
                            setSelectedRow,
                            selectedRow,
                            userPaused,
                            currentTrack,
                            pauseOrLoadSong
                        }: RowProps) => {
    const isActive = song.fullPath === currentTrack;

    return (
        <div
            id={selectedRow === song.name ? s.activeRow : ""}
            className={`${s.songRow} ${s.grid}`}
            onClick={(e) => {
                e.stopPropagation();
                setSelectedRow(song.name);
            }}
        >
            <div className={s.trackColumn}>
                <div className={s.trackNumberWrapper}>
                    <p className={classNames(s.trackNumber, isActive && s.playing)}>{index + 1}</p>
                    <button className={s.playButton} onClick={() => pauseOrLoadSong(song)}>
                        {isActive && !userPaused ? <FaPause size={23}/> : <FaPlay size={19}/>}
                    </button>
                </div>
                <div className={s.trackElement}>
                    <div className={s.cover}>
                        <img className={s.img} src={song.picture} alt="cover"/>
                    </div>
                    <div className={s.trackInfo}>
                        <p className={classNames(s.trackTitle, s.ellipsis, isActive && s.playing)}>{song.title}</p>
                        <p className={classNames(s.trackArtist, s.ellipsis)}>
                            {song.artists.map((a, i) => (
                                <span key={a}>
                                    <span className={s.link}>{a}</span>
                                    {i < song.artists.length - 1 ? ", " : ""}
                                </span>
                            ))}
                        </p>
                    </div>
                </div>
            </div>
            <a className={classNames(s.trackAlbum, s.ellipsis)}>{song.album}</a>
            <p className={classNames(s.timestamp, s.ellipsis)}>{format(song.createdAt)}</p>
            <p className={s.trackDuration}>{secondsToTime(song.duration ?? 0)}</p>
            <p></p>
        </div>
    );
};
