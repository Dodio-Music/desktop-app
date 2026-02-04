import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import {SongRow} from "@renderer/components/SongList/SongRow";
import {BaseSongEntry, isLocalSong, isRemoteSong} from "../../../../shared/TrackInfo";
import {RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";
import s from "./SongList.module.css";
import {SongRowSlot} from "@renderer/components/SongList/ColumnConfig";
import {AutoSizer, List, ListRowProps, WindowScroller} from "react-virtualized";
import {ContextActionHelpers, renderEntityActions} from "@renderer/contextMenus/menuHelper";
import {useContextMenu} from "@renderer/hooks/useContextMenu";
import {ContextMenu} from "@renderer/contextMenus/ContextMenu";
import {errorToString} from "@renderer/util/errorToString";
import toast from "react-hot-toast";

interface SongListAutoScroll {
    scrollToId: string;
    timestamp: Date;
}

interface SongListHelpers {
    enableDrag?: boolean;
    playlistId?: number;
    navigate?: (path: string) => void;
    refresh?: () => void;
}

interface Props<T extends BaseSongEntry> {
    songs: T[];
    slots: SongRowSlot<T>[];
    gridTemplateColumns?: string;
    scrollElement: RefObject<HTMLDivElement | null>;
    scroll?: SongListAutoScroll;
    navigate?: (path: string) => void;
    contextHelpers?: ContextActionHelpers;
    helpers?: SongListHelpers;
}

const ROW_HEIGHT = 66;

export const SongList = <T extends BaseSongEntry>({
                                                      songs,
                                                      slots,
                                                      gridTemplateColumns = "30px 4.5fr 3fr 1.8fr 105px",
                                                      scrollElement,
                                                      scroll,
                                                      contextHelpers,
                                                      navigate,
                                                      helpers
                                                  }: Props<T>) => {
    const [selectedRow, setSelectedRow] = useState<string | undefined>(undefined);
    const listRef = useRef<HTMLDivElement>(null);
    const currentTrack = useSelector((root: RootState) => root.nativePlayer.currentTrack);
    const ctx = useContextMenu();

    const setSelectedRowCallback = useCallback((id?: string) => setSelectedRow(id), []);

    const songsRef = useRef(songs);
    const currentTrackRef = useRef(currentTrack);

    const draggingIdRef = useRef<string | null>(null);
    const dragOverIndexRef = useRef<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOverIndexUI, setDragOverIndexUI] = useState<number | null>(null);
    const dragStartIndexRef = useRef<number | null>(null);
    const listOffsetTopRef = useRef(0);

    const getIndexFromClientY = (clientY: number) => {
        if (!scrollElement.current) return null;

        const y = clientY -
            scrollElement.current.getBoundingClientRect().top +
            scrollElement.current.scrollTop -
            listOffsetTopRef.current;

        const rawIndex = (y - ROW_HEIGHT / 2) / ROW_HEIGHT;
        return Math.max(0, Math.min(songs.length, Math.floor(rawIndex)));
    };

    useLayoutEffect(() => {
        if (!listRef.current || !scrollElement.current) return;

        const listRect = listRef.current.getBoundingClientRect();
        const scrollRect = scrollElement.current.getBoundingClientRect();

        listOffsetTopRef.current =
            listRect.top - scrollRect.top + scrollElement.current.scrollTop;
    }, []);

    const handlePointerUp = async () => {
        window.removeEventListener("pointermove", handlePointerMoveRAF);
        window.removeEventListener("pointerup", handlePointerUp);

        const draggingId = draggingIdRef.current;
        const end = dragOverIndexRef.current;
        const start = dragStartIndexRef.current;
        const list = songsRef.current;

        if (draggingId && end !== null && start !== null && helpers?.playlistId) {
            const beforeRaw = end - 1;
            const afterRaw = end;

            if (start !== beforeRaw && start !== afterRaw) {
                const before = list[beforeRaw]?.id ?? null;
                const after = list[afterRaw]?.id ?? null;
                const moved = list[start].id;

                const res = await window.api.authRequest<string>("post", `/playlist/${helpers.playlistId}/song/reorder`, {
                    playlistSongId: moved,
                    leftSongId: before,
                    rightSongId: after
                });
                if (res.type === "error") {
                    toast.error(errorToString(res.error));
                }
            }
        }

        draggingIdRef.current = null;
        dragOverIndexRef.current = null;
        dragStartIndexRef.current = null;
        setIsDragging(false);
        setDragOverIndexUI(null);
    };

    const tickingRef = useRef(false);
    const latestClientYRef = useRef(0);
    const handlePointerMoveRAF = (e: PointerEvent) => {
        latestClientYRef.current = e.clientY;
        if (!tickingRef.current) {
            tickingRef.current = true;
            window.requestAnimationFrame(() => {
                const idx = getIndexFromClientY(latestClientYRef.current);
                if (idx !== null) {
                    dragOverIndexRef.current = idx;
                    setDragOverIndexUI(idx);
                }
                tickingRef.current = false;
            });
        }
    };

    const handleDragStart = useCallback((id: string, index: number) => {
        if (!helpers?.enableDrag) return;

        dragStartIndexRef.current = index;
        draggingIdRef.current = id;

        setIsDragging(true);

        window.addEventListener("pointermove", handlePointerMoveRAF);
        window.addEventListener("pointerup", handlePointerUp);
    }, []);

    useEffect(() => {
        return () => {
            window.removeEventListener("pointermove", handlePointerMoveRAF);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, []);

    useEffect(() => {
        songsRef.current = songs;
    }, [songs]);
    useEffect(() => {
        currentTrackRef.current = currentTrack;
    }, [currentTrack]);

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

            if ((e.target as HTMLElement).closest("[role=\"menu\"]")) {
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
                    slots={slots}
                    openContextMenu={ctx.open}
                    navigate={navigate}
                    onDragStart={helpers?.enableDrag ? handleDragStart : undefined}
                />
            </div>
        );
    }, [songs, currentTrack?.id, selectedRow, gridTemplateColumns, pauseOrLoadSong, setSelectedRowCallback, slots, ctx.open, navigate, helpers, handleDragStart]);

    useEffect(() => {
        if (!scroll || !scrollElement.current) return;
        const index = songs.findIndex(s => s.id === scroll.scrollToId);

        if (index < 0) return;
        const HEADER_HEIGHT = 250;
        const top = index * ROW_HEIGHT - (scrollElement.current.clientHeight / 2) + ROW_HEIGHT / 2 + HEADER_HEIGHT;
        scrollElement.current?.scrollTo({
            top,
            behavior: "smooth"
        });
    }, [scroll, scrollElement, songs]);

    if (!scrollElement.current) {
        return <div className={s.songList} ref={listRef}/>;
    }

    return (
        <div className={`${s.songList} ${isDragging ? "dragging" : ""}`} ref={listRef}>
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
                        {({width}) => <><List
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
                        />
                            {helpers?.enableDrag && isDragging && dragOverIndexUI !== null && (
                                <div
                                    className={s.dropIndicator}
                                    style={{top: dragOverIndexUI * ROW_HEIGHT}}
                                />
                            )}
                        </>}
                    </AutoSizer>
                )}
            </WindowScroller>
            <ContextMenu ctx={ctx}>
                {ctx.state && renderEntityActions(ctx.state.target, ctx.close, contextHelpers ?? {})}
            </ContextMenu>
        </div>
    );
};
