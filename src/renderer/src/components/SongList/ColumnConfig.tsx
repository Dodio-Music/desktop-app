import {BaseSongEntry, LocalSongEntry, RemoteSongEntry} from "../../../../shared/TrackInfo";
import {format} from "timeago.js";
import {secondsToTime} from "@renderer/util/timeUtils";
import {WiTime3} from "react-icons/wi";
import {MouseEvent, ReactNode} from "react";
import s from "./SongList.module.css";
import classNames from "classnames";
import {FaPause, FaPlay, FaRegCircleUser} from "react-icons/fa6";
import placeholder from "../../../../../resources/img-placeholder-128x128.svg";
import {HiOutlineDotsHorizontal} from "react-icons/hi";
import {ContextEntity} from "@renderer/contextMenus/menuHelper";

export interface SongRowSlotProps<T> {
    song: T;
    isActive: boolean;
    userPaused: boolean | null;
    index: number;
    handlePlay: (song: T) => void;
    isSelected: boolean;
    openContextMenu: (
        e: MouseEvent,
        target: ContextEntity,
    ) => void;
}

export interface SongRowSlot<T> {
    render: (props: SongRowSlotProps<T>) => ReactNode;
    header?: ReactNode;
}

const playRow = <T extends BaseSongEntry>(): SongRowSlot<T> => ({
    header: (
        <div className={s.numberHeaderWrapper}>
            <p className={`${s.textRight}`}>#</p>
        </div>
    ),
    render: ({isActive, userPaused, handlePlay, index, song}) => (
        <div className={s.trackNumberWrapper}>
            <p className={classNames(s.trackNumber, isActive && s.playing)}>{index + 1}</p>
            <button className={s.playButton} onClick={() => handlePlay(song)}>
                {isActive && !userPaused ? <FaPause size={26}/> : <FaPlay size={24}/>}
            </button>
        </div>
    )
});

export const localSongRowSlots: SongRowSlot<LocalSongEntry>[] = [
    playRow<LocalSongEntry>(),
    {
        header: <p>Title</p>,
        render: ({song, isActive}) => (
            <div className={s.trackColumn}>
                <div className={s.trackElement}>
                    <div className={s.cover}>
                        <img className={s.img} src={song.picture ?? placeholder} alt="cover" loading={"lazy"}/>
                    </div>
                    <div className={s.trackInfo}>
                        <p className={classNames(s.trackTitle, s.ellipsis, isActive && s.playing)}>{song.title}</p>
                        <p className={classNames(s.trackArtist, s.ellipsis)}>
                            {song.artists.map((a, i) => (
                                <span key={a}>
                                    <span>{a}</span>
                                    {i < song.artists.length - 1 ? ", " : ""}
                                </span>
                            ))}
                        </p>
                    </div>
                </div>
            </div>
        )
    },
    {
        header: <p>Album</p>,
        render: ({song}) => <p className={classNames(s.trackAlbum, s.ellipsis)}>{song.album}</p>
    },
    {
        header: <p>Date added</p>,
        render: ({song}) => <p className={classNames(s.timestamp, s.ellipsis)}>{format(song.createdAt)}</p>
    },
    {
        header: <p className={s.durationHeader}><WiTime3/></p>,
        render: ({song}) => <p className={classNames(s.trackDuration, s.rightPad)}>{secondsToTime(song.duration ?? 0)}</p>
    }
];

export const remoteSongRowSlots: SongRowSlot<RemoteSongEntry>[] = [
    playRow<RemoteSongEntry>(),
    {
        header: <p>Title</p>,
        render: ({song, isActive}) => (
            <div className={s.trackColumn}>
                <div className={s.trackElement}>
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
        )
    },
    {
        header: <p className={s.playsHeader}>Plays</p>,
        render: () => <p className={classNames(s.plays, s.ellipsis)}>0</p>
    },
    {
        header: <p className={s.durationHeader}><WiTime3/></p>,
        render: ({song, isSelected, openContextMenu}) => <div className={s.lastColumn}>
            <p className={s.trackDuration}>{secondsToTime(song.duration ?? 0)}</p>
            <HiOutlineDotsHorizontal onClick={(e) => openContextMenu(e, {type: "song", data: song})} size={24} className={classNames(s.menu, isSelected && s.showOptions)} />
        </div>
    }
];

export const playlistSongRowSlots: SongRowSlot<RemoteSongEntry>[] = [
    playRow<RemoteSongEntry>(),
    {
        header: <p>Title</p>,
        render: ({song, isActive}) => (
            <div className={s.trackColumn}>
                <div className={s.trackElement}>
                    <div className={s.cover}>
                        <img className={s.img} src={song.picture ? song.picture + "?size=thumb" : placeholder}
                             alt="cover" loading={"lazy"}/>
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
        )
    },
    {
        header: <p>Album</p>,
        render: ({song}) => <p className={classNames(s.trackAlbum, s.ellipsis, s.link)}>{song.album}</p>
    },
    {
        header: <p>Added</p>,
        render: ({song}) => <p
            className={classNames(s.timestamp, s.ellipsis)}>{song.addedAt && format(song.addedAt)}</p>
    },
    {
        header: <p>Added by</p>,
        render: ({song}) => <div className={s.addedBy}><FaRegCircleUser/><p
            className={classNames(s.ellipsis)}>{song.addedBy &&
            <span className={s.link}>{song.addedBy.displayName}</span>}</p></div>
    },
    {
        header: <p className={s.durationHeader}><WiTime3/></p>,
        render: ({song, isSelected, openContextMenu}) => <div className={s.lastColumn}>
            <p className={s.trackDuration}>{secondsToTime(song.duration ?? 0)}</p>
            <HiOutlineDotsHorizontal onClick={(e) => openContextMenu(e, {type: "song", data: song})} size={24} className={classNames(s.menu, isSelected && s.showOptions)} />
        </div>
    }
];
