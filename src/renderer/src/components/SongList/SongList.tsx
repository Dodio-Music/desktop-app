import {shallowEqual, useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import {SongRow} from "@renderer/components/SongList/SongRow";
import {BaseSongEntry, isLocalSong, isRemoteSong} from "../../../../shared/TrackInfo";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import s from "./SongList.module.css";
import {SongRowSlot} from "@renderer/components/SongList/ColumnConfig";

interface Props<T extends BaseSongEntry> {
    songs: T[];
    slots: SongRowSlot<T>[];
    gridTemplateColumns?: string;
}

export const SongList = <T extends BaseSongEntry>({
                                                      songs,
                                                      slots,
                                                      gridTemplateColumns = "30px 4.5fr 3fr 1.8fr 50px"
                                                  }: Props<T>) => {
    const [selectedRow, setSelectedRow] = useState<string | undefined>(undefined);
    const listRef = useRef<HTMLDivElement>(null);
    const currentTrack = useSelector((root: RootState) => root.nativePlayer.currentTrack, shallowEqual);
    const userPaused = useSelector((root: RootState) => root.nativePlayer.userPaused);

    const id = currentTrack?.id ?? null;

    const memoSlots = useMemo(() => slots, [slots]);
    const setSelectedRowCallback = useCallback((id?: string) => setSelectedRow(id), []);
    const currentTrackRef = useRef(currentTrack);

    useEffect(() => {
        currentTrackRef.current = currentTrack;
    }, [currentTrack]);

    const pauseOrLoadSong = useCallback((song: T) => {
        if (song.id === currentTrackRef.current?.id) {
            window.api.pauseOrResume();
        } else {
            if (isLocalSong(song)) window.api.loadTrack(song, songs);
            else if (isRemoteSong(song)) window.api.loadTrackRemote(song, songs);
        }
    }, [songs]);

    // deselect handler -> clicking anywhere results in a song deselect
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (!listRef.current) return;

            const target = e.target as HTMLElement;

            if (!listRef.current.contains(target)) {
                setSelectedRow(undefined);
                return;
            }

            const row = target.closest("[data-row='true']");
            if (!row) {
                setSelectedRow(undefined);
            }
        };
        document.addEventListener("click", handleClick);

        return () => document.removeEventListener("click", handleClick);
    }, []);

    return (
        <div className={s.songList} ref={listRef}>
            <div className={`${s.headRow} ${s.grid}`} style={{gridTemplateColumns}}>
                {slots.map((slot, i) => (
                    <div key={i} className={s.colWrapper}>
                        {slot.header}
                    </div>
                ))}
            </div>
            <div className={s.divider}/>
            {songs.map((song, index) => {
                const isActive = song.id === id;
                const isSelected = song.id === selectedRow;
                return (
                    <SongRow
                        key={song.id}
                        index={index}
                        song={song}
                        userPaused={userPaused}
                        gridTemplateColumns={gridTemplateColumns}
                        pauseOrLoadSong={pauseOrLoadSong}
                        isActive={isActive}
                        isSelected={isSelected}
                        setSelectedRow={setSelectedRowCallback}
                        slots={memoSlots}
                    />
                );
            })}
        </div>
    );
};
