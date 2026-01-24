import s from "./SongList.module.css";
import {BaseSongEntry, isRemoteSong} from "../../../../shared/TrackInfo";
import React, {JSX, useCallback, MouseEvent} from "react";
import {SongRowSlot} from "@renderer/components/SongList/ColumnConfig";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import classNames from "classnames";

interface RowProps<T extends BaseSongEntry> {
    index: number,
    song: T,
    slots: SongRowSlot<T>[];
    isSelected: boolean;
    setSelectedRow: (name?: string) => void;
    isActive: boolean;
    pauseOrLoadSong: (song: T) => void;
    gridTemplateColumns: string;
    openContextMenu: (e: MouseEvent, song: T) => void;
}

export const SongRow = React.memo(function SongRow<T extends BaseSongEntry>({
                                                                                index,
                                                                                song,
                                                                                setSelectedRow,
                                                                                isSelected,
                                                                                isActive,
                                                                                pauseOrLoadSong,
                                                                                slots,
                                                                                gridTemplateColumns,
                                                                                openContextMenu
                                                                            }: RowProps<T>) {
    const handlePlay = useCallback((song: T) => pauseOrLoadSong(song), [pauseOrLoadSong]);
    const userPaused = useSelector(
        (root: RootState) =>
            isActive ? root.nativePlayer.userPaused : null
    );

    const rowClass = `${s.songRow} ${s.grid}`;
    return (
        <div
            data-row={"true"}
            id={`song-${song.id}`}
            className={classNames(rowClass, isSelected && s.activeRow)}
            style={{gridTemplateColumns}}
            onClick={(e) => {
                e.stopPropagation();
                setSelectedRow(song.id);
            }}
            onContextMenu={(e) => isRemoteSong(song) && openContextMenu(e, song)}
            onDoubleClick={(e) => {
                if ((e.target as HTMLElement).closest("button")) return;
                handlePlay(song);
            }}
        >
            {slots.map((slot, i) => (
                <div key={i} className={s.colWrapper}>
                    {slot.render({song, isActive, userPaused, index, handlePlay})}
                </div>
            ))}
        </div>
    );
}) as <T extends BaseSongEntry>(props: RowProps<T>) => JSX.Element;
