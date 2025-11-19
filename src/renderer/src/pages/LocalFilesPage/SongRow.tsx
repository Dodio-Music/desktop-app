import {FaPlay, FaPause} from "react-icons/fa6";
import {format} from "timeago.js";
import s from "./LocalFilesPage.module.css";
import {secondsToTime} from "../../util/timeUtils";
import classNames from "classnames";
import {BaseSongEntry, isLocalSong} from "../../../../shared/TrackInfo";
import React, {useCallback, useMemo} from "react";
import placeholder from "../../../../../resources/img-placeholder-128x128.svg";

interface RowProps {
    index: number,
    song: BaseSongEntry,
    selectedRow?: string;
    setSelectedRow: (name?: string) => void;
    currentTrackId: string | null;
    userPaused: boolean;
    pauseOrLoadSong: (song: BaseSongEntry) => void;
}

export const SongRow = React.memo(function SongRow({
                            index,
                            song,
                            setSelectedRow,
                            selectedRow,
                            userPaused,
                            currentTrackId,
                            pauseOrLoadSong
                        }: RowProps) {
    const isActive = song.id === currentTrackId;

    const handlePlay = useCallback((song: BaseSongEntry) => pauseOrLoadSong(song), [pauseOrLoadSong]);

    const timestamp = useMemo(() => isLocalSong(song) ? format(song.createdAt) : "", [song]);

    const rowClass = `${s.songRow} ${s.grid}`;
    return (
        <div
            id={selectedRow === song.id ? s.activeRow : ""}
            className={rowClass}
            onClick={(e) => {
                e.stopPropagation();
                setSelectedRow(song.id);
            }}
        >
            <div className={s.trackColumn}>
                <div className={s.trackNumberWrapper}>
                    <p className={classNames(s.trackNumber, isActive && s.playing)}>{index + 1}</p>
                    <button className={s.playButton} onClick={() => handlePlay(song)}>
                        {isActive && !userPaused ? <FaPause size={23}/> : <FaPlay size={19}/>}
                    </button>
                </div>
                <div className={s.trackElement}>
                    <div className={s.cover}>
                        <img className={s.img} src={song.picture ?? placeholder} alt="cover" loading={"lazy"}/>
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
            <p className={classNames(s.timestamp, s.ellipsis)}>{timestamp}</p>
            <p className={s.trackDuration}>{secondsToTime(song.duration ?? 0)}</p>
            <p></p>
        </div>
    );
});
