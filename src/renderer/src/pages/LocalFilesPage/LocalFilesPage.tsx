import {useEffect, useRef, useState} from "react";
import s from "./LocalFilesPage.module.css";
import {WiTime3} from "react-icons/wi";
import {SongList} from "@renderer/pages/LocalFilesPage/SongList";
import {LocalSongEntry, SongDirectoryResponse} from "../../../../shared/TrackInfo";

const LocalFilesPage = () => {
    const [songs, setSongs] = useState<LocalSongEntry[]>([]);
    const [error, setError] = useState("");
    const [selectedRow, setSelectedRow] = useState<string | undefined>(undefined);
    const songMapRef = useRef<Map<string, LocalSongEntry>>(new Map());

    const handleWrapperClick = () => {
        setSelectedRow(undefined);
    };

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
                setSongs([...songMapRef.current.values()]);
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
        <div className={"pageWrapper"} onClick={handleWrapperClick}>
            <h1>Local Files</h1>
            {error ?
                <>
                    <p className={s.error}>{error}</p>
                    <button onClick={() => handleDialog()} className={s.dirButton}>Set Song Directory</button>
                </>
                :

                <div className={s.songList}>
                    <div className={`${s.headRow} ${s.grid}`}>
                        <div className={s.trackColumn}>
                            <div className={s.numberHeaderWrapper}>
                                <p className={`${s.textRight}`}>#</p>
                            </div>
                            <p>Title</p>
                        </div>
                        <p>Album</p>
                        <p>Date added</p>
                        <p className={s.durationHeader}><WiTime3/></p>
                        <p></p>
                    </div>
                    <div className={s.divider}/>
                    <SongList
                        songs={songs}
                        selectedRow={selectedRow}
                        setSelectedRow={setSelectedRow}
                    />
                </div>
            }
        </div>
    );
};

export default LocalFilesPage;
