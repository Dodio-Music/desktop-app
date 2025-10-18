import {useEffect, useState} from "react";

import s from "./LocalFilesPage.module.css";
import {WiTime3} from "react-icons/wi";
import {SongList} from "@renderer/pages/LocalFilesPage/SongList";

export interface SongEntry {
    name: string;
    fullPath: string;
    title: string;
    artists: string[];
    album: string;
    track?: number;
    duration?: number;
    picture?: string;
    createdAt: Date;
}

const LocalFilesPage = () => {
        const [songs, setSongs] = useState<SongEntry[]>([]);
        const [error, setError] = useState("");
        const [selectedRow, setSelectedRow] = useState<string | undefined>(undefined);

        const handleWrapperClick = () => {
            setSelectedRow(undefined);
        };

        const handleDialog = () => {
            window.api.showLocalFilesDialog();
        }

        useEffect(() => {
            const handler = () => {
                (async() => {
                    const preferences = await window.api.getPreferences();
                    if(preferences.localFilesDir === undefined) {
                        setError("You haven't set a song directory yet!");
                        return;
                    }

                    const data = await window.api.listLocalSongs(preferences.localFilesDir);
                    if (data === null) {
                        setSongs([]);
                        setError(preferences.localFilesDir + " does not exist! Please set your local files directory again.");
                        return;
                    }
                    setSongs(data);
                    setError("");
                })();
            };
            handler();

            const unsub = window.api.onPreferencesUpdated(handler);

            return () => {
                unsub();
            }
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
    }
;

export default LocalFilesPage;
