import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import {SongRow} from "@renderer/components/SongList/SongRow";
import {BaseSongEntry, isLocalSong, isRemoteSong} from "../../../../shared/TrackInfo";
import React, {RefObject, useCallback, useEffect, useMemo, useRef, useState} from "react";
import s from "./SongList.module.css";
import {SongRowSlot} from "@renderer/components/SongList/ColumnConfig";
import {AutoSizer, List, ListRowProps, WindowScroller} from "react-virtualized";
import {ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { IoAddOutline } from "react-icons/io5";

interface SongListAutoScroll {
    scrollToId: string;
    timestamp: Date;
}

interface Props<T extends BaseSongEntry> {
    songs: T[];
    slots: SongRowSlot<T>[];
    gridTemplateColumns?: string;
    scrollElement: RefObject<HTMLDivElement | null>;
    scroll?: SongListAutoScroll;
}

const ROW_HEIGHT = 66;

export const SongList = <T extends BaseSongEntry>({
                                                      songs,
                                                      slots,
                                                      gridTemplateColumns = "30px 4.5fr 3fr 1.8fr 50px",
                                                      scrollElement,
                                                      scroll
                                                  }: Props<T>) => {
    const [selectedRow, setSelectedRow] = useState<string | undefined>(undefined);
    const listRef = useRef<HTMLDivElement>(null);
    const currentTrack = useSelector((root: RootState) => root.nativePlayer.currentTrack);
    const [contextMenu, setContextMenu] = useState<{ song: T; mouseX: number; mouseY: number; } | null>(null);

    const memoSlots = useMemo(() => slots, [slots]);
    const setSelectedRowCallback = useCallback((id?: string) => setSelectedRow(id), []);

    const songsRef = useRef(songs);
    const currentTrackRef = useRef(currentTrack);

    useEffect(() => {
        songsRef.current = songs;
    }, [songs]);
    useEffect(() => {
        currentTrackRef.current = currentTrack;
    }, [currentTrack]);

    const handleContextMenu = (e: React.MouseEvent, song: T) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedRow(song.id);

        setContextMenu({
            song,
            mouseX: e.clientX + 2,
            mouseY: e.clientY - 6
        });
    };

    const handleContextMenuCb = useCallback(
        (e: React.MouseEvent, song: T) => handleContextMenu(e, song),
        []
    );

    const closeMenu = () => setContextMenu(null);

    const pauseOrLoadSong = useCallback((song: T) => {
        if (song.id === currentTrackRef.current?.id) {
            window.api.pauseOrResume();
        } else {
            const list = songsRef.current;
            if (isLocalSong(song)) window.api.loadTrack(song, list);
            else if (isRemoteSong(song)) window.api.loadTrackRemote(song, list);
        }
    }, []);

    // deselect handler -> clicking anywhere results in a song deselect
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (!listRef.current) return;

            const target = e.target as HTMLElement;

            if ((e.target as HTMLElement).closest('[role="menu"]')) {
                return;
            }

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

    const rowRender = useCallback(({index, style}: ListRowProps) => {
        const song = songs[index];
        const isActive = song.id === currentTrack?.id;
        const isSelected = song.id === selectedRow;
        return (
            <div style={style} key={song.id} className={s.listContainer}>
                <SongRow
                    index={index}
                    song={song}
                    gridTemplateColumns={gridTemplateColumns}
                    pauseOrLoadSong={pauseOrLoadSong}
                    isActive={isActive}
                    isSelected={isSelected}
                    setSelectedRow={setSelectedRowCallback}
                    slots={memoSlots}
                    openContextMenu={handleContextMenuCb}
                />
            </div>
        );
    }, [currentTrack, gridTemplateColumns, handleContextMenuCb, memoSlots, pauseOrLoadSong, selectedRow, setSelectedRowCallback, songs]);

    useEffect(() => {
        if (!scroll || !scrollElement.current) return;
        const index = songs.findIndex(s => s.id === scroll.scrollToId);

        console.log("trying...");
        if (index < 0) return;
        const HEADER_HEIGHT = 250;
        const top = index * ROW_HEIGHT - (scrollElement.current.clientHeight / 2) + ROW_HEIGHT / 2 + HEADER_HEIGHT;
        console.log("scrolling to " + top);
        // request animation frame -> fix for redirect from another page
        requestAnimationFrame(() => {
            scrollElement.current?.scrollTo({
                top,
                behavior: "smooth"
            });
        });

    }, [scroll, scrollElement, songs]);

    if (!scrollElement.current) {
        return <div className={s.songList} ref={listRef}/>;
    }

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
            <WindowScroller scrollElement={scrollElement.current} style={{outline: "none"}}>
                {({height, isScrolling, scrollTop}) => (
                    <AutoSizer disableHeight={true} style={{outline: "none"}}>
                        {({width}) => <List
                            style={{outline: "none"}}
                            autoHeight={true}
                            height={height}
                            width={width}
                            rowCount={songs.length}
                            rowHeight={ROW_HEIGHT}
                            rowRenderer={rowRender}
                            scrollTop={scrollTop}
                            isScrolling={isScrolling}
                            overscanRowCount={10}
                        />}
                    </AutoSizer>
                )}
            </WindowScroller>
            <Menu
                open={Boolean(contextMenu)}
                onClose={closeMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu
                        ? {top: contextMenu.mouseY, left: contextMenu.mouseX}
                        : undefined
                }
                disableAutoFocusItem
                disableRestoreFocus
            >
                <MenuItem>
                    <ListItemIcon>
                        <IoAddOutline color={"rgb(255,255,255)"} size={22}/>
                    </ListItemIcon>
                    <ListItemText
                        primary="Add to Playlist"
                        sx={{color: "rgb(255,255,255)"}}
                    />
                </MenuItem>
            </Menu>
        </div>
    );
};
