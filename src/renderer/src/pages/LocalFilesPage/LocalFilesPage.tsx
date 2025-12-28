import {useEffect, useRef, useState} from "react";
import s from "./LocalFilesPage.module.css";
import {SongList} from "@renderer/components/SongList/SongList";
import {LocalSongEntry, SongDirectoryResponse} from "../../../../shared/TrackInfo";
import {localSongRowSlots} from "@renderer/components/SongList/ColumnConfig";
import {useLocation} from "react-router-dom";

const LocalFilesPage = () => {
    const location = useLocation();
    const [songs, setSongs] = useState<LocalSongEntry[]>([]);
    const [error, setError] = useState("");
    const scrollPageRef = useRef<HTMLDivElement>(null);

    const handleDialog = async () => {
        await window.api.showLocalFilesDialog();
        void getAllSongs();
    };

    const getAllSongs = () => {
        window.api.getAllSongs();
    }

    useEffect(() => {
        const handleSongEmit = (sdr: SongDirectoryResponse) => {
            if(sdr.success) {
                setError("");
                setSongs(sdr.songs);
            } else {
                setError(sdr.error);
                setSongs([]);
            }
        }

        const unsub = window.api.onSongEmit(handleSongEmit);
        void getAllSongs();

        return () => {
            unsub();
        };
    }, []);

    return (
        <div className={"pageWrapper pageWrapperFullHeight"} ref={scrollPageRef}>
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
                    scrollElement={scrollPageRef}
                    scroll={location.state?.scroll}
                />
            }
        </div>
    );
};

export default LocalFilesPage;
