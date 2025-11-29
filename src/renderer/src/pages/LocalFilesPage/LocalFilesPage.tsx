import {useEffect, useRef, useState} from "react";
import s from "./LocalFilesPage.module.css";
import {SongList} from "@renderer/components/SongList/SongList";
import {LocalSongEntry, SongDirectoryResponse} from "../../../../shared/TrackInfo";
import {localSongRowSlots} from "@renderer/components/SongList/ColumnConfig";

const LocalFilesPage = () => {
    const [songs, setSongs] = useState<LocalSongEntry[]>([]);
    const [error, setError] = useState("");
    const songMapRef = useRef<Map<string, LocalSongEntry>>(new Map());

    const handleDialog = async () => {
        await window.api.showLocalFilesDialog();
        startScan();
    };

    const startScan = () => {
        songMapRef.current = new Map();
        setSongs([]);
        window.api.startSongScan();

        const handleBasic = (res: SongDirectoryResponse) => {
            if (!res.success) {
                setError(res.error);
                return;
            }
            setError("");
            songMapRef.current.set(res.song.id, res.song);
            setSongs([...songMapRef.current.values()]);
            setSongs(prev =>
                prev.map(s => s.id === res.song.id ? {...s, ...res.song} : s)
            );
        };

        const handleMeta = (res: SongDirectoryResponse) => {
            if (!res.success) {
                setError(res.error);
                return;
            }

            const existing = songMapRef.current.get(res.song.id);
            if (existing) {
                setError("");
                Object.assign(existing, res.song);
                setSongs(prev =>
                    prev.map(s => s.id === res.song.id ? {...s, ...res.song} : s)
                );
            }
        };

        const unsubscribeBasic = window.api.onSongBasic(handleBasic);
        const unsubscribeMeta = window.api.onSongMetadata(handleMeta);

        return () => {
            unsubscribeBasic();
            unsubscribeMeta();
        };
    };

    useEffect(() => {
        const cleanup = startScan();
        return () => cleanup?.();
    }, []);

    return (
        <div className={"pageWrapper"}>
            <h1>Local Files</h1>
            {error ?
                <>
                    <p className={s.error}>{error}</p>
                    <button onClick={() => handleDialog()} className={s.dirButton}>Set Song Directory</button>
                </>
                :
                <SongList
                    songs={songs}
                    slots={localSongRowSlots}
                />
            }
        </div>
    );
};

export default LocalFilesPage;
