import s from "./SongList.module.css";
import {BaseSongEntry} from "../../../../shared/TrackInfo";
import React, {JSX, useCallback} from "react";
import {SongRowSlot} from "@renderer/components/SongList/ColumnConfig";

interface RowProps<T extends BaseSongEntry> {
    index: number,
    song: T,
    slots: SongRowSlot<T>[];
    isSelected: boolean;
    setSelectedRow: (name?: string) => void;
    isActive: boolean;
    userPaused: boolean;
    pauseOrLoadSong: (song: T) => void;
    gridTemplateColumns: string;
}

export const SongRow = React.memo(function SongRow<T extends BaseSongEntry>({
                                                          index,
                                                          song,
                                                          setSelectedRow,
                                                          isSelected,
                                                          userPaused,
                                                          isActive,
                                                          pauseOrLoadSong,
                                                          slots,
                                                          gridTemplateColumns
                                                      }: RowProps<T>) {

    const handlePlay = useCallback((song: T) => pauseOrLoadSong(song), [pauseOrLoadSong]);

    const rowClass = `${s.songRow} ${s.grid}`;
    return (
        <div
            data-row={"true"}
            id={isSelected ? s.activeRow : ""}
            className={rowClass}
            style={{gridTemplateColumns}}
            onClick={(e) => {
                e.stopPropagation();
                setSelectedRow(song.id);
            }}
            onDoubleClick={() => handlePlay(song)}
        >
            {slots.map((slot, i) => (
                <div key={i} className={s.colWrapper}>
                    {slot.render({song, isActive, userPaused, index, handlePlay})}
                </div>
            ))}
        </div>
    );
}) as <T extends BaseSongEntry>(props: RowProps<T>) => JSX.Element;
