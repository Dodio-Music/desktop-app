import s from "./SongList.module.css";
import {BaseSongEntry, isRemoteSong} from "../../../../shared/TrackInfo";
import React, {JSX, useCallback, MouseEvent, useRef} from "react";
import {SongRowSlot} from "@renderer/components/SongList/ColumnConfig";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import classNames from "classnames";
import {ContextEntity} from "@renderer/contextMenus/menuHelper";

interface RowProps<T extends BaseSongEntry> {
    index: number,
    song: T,
    slots: SongRowSlot<T>[];
    isSelected: boolean;
    setSelectedRow: (name?: string) => void;
    isActive: boolean;
    pauseOrLoadSong: (song: T) => void;
    gridTemplateColumns: string;
    navigate?: (path: string) => void;
    openContextMenu: (
        e: MouseEvent,
        target: ContextEntity
    ) => void;
    onDragStart?: (id: string, index: number) => void;
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
                                                                                openContextMenu,
                                                                                navigate,
                                                                                onDragStart
                                                                            }: RowProps<T>) {
    const handlePlay = useCallback((song: T) => pauseOrLoadSong(song), [pauseOrLoadSong]);
    const pointerDownRef = useRef<{x: number, y: number} | null>(null);

    const userPaused = useSelector(
        (root: RootState) =>
            isActive ? root.nativePlayer.userPaused : null
    );

    const rowClass = `${s.songRow} ${s.grid}`;
    return (
        <div
            onPointerDown={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest(`button, a, input, .no-drag, .${s.link}`)) return;

                pointerDownRef.current = { x: e.clientX, y: e.clientY };
                setSelectedRow(song.id);

                (e.target as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
                if (!pointerDownRef.current) return;
                const dy = e.clientY - pointerDownRef.current.y;

                if (Math.abs(dy) > 33) {
                    onDragStart?.(song.id, index);
                    pointerDownRef.current = null;
                }
            }}
            onPointerUp={(e) => {
                pointerDownRef.current = null;
                (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            }}
            data-row={"true"}
            id={`song-${song.id}`}
            className={classNames(rowClass, isSelected && s.activeRow)}
            style={{gridTemplateColumns}}
            onClick={(e) => {
                e.stopPropagation();
                setSelectedRow(song.id);
            }}
            onContextMenu={(e) => isRemoteSong(song) && openContextMenu(e, {type: "song", data: song})}
            onDoubleClick={(e) => {
                if ((e.target as HTMLElement).closest("button")) return;
                handlePlay(song);
            }}
        >
            {slots.map((slot, i) => (
                <div key={i} className={s.colWrapper}>
                    {slot.render({
                        song,
                        isActive,
                        isSelected,
                        userPaused,
                        index,
                        handlePlay,
                        openContextMenu,
                        navigate
                    })}
                </div>
            ))}
        </div>
    );
}) as <T extends BaseSongEntry>(props: RowProps<T>) => JSX.Element;
