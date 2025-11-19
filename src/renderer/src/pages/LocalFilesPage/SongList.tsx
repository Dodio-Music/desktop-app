import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import {SongRow} from "@renderer/pages/LocalFilesPage/SongRow";
import {BaseSongEntry, isLocalSong} from "../../../../shared/TrackInfo";
import {useCallback} from "react";

interface Props {
    songs: BaseSongEntry[];
    selectedRow?: string;
    setSelectedRow: (name?: string) => void;
}

export const SongList = ({songs, selectedRow, setSelectedRow}: Props) => {
    const {id, userPaused} = useSelector((root: RootState) => root.nativePlayer);

    const pauseOrLoadSong = useCallback((song: BaseSongEntry) => {
        if (song.id === id) window.api.pauseOrResume();
        else if (isLocalSong(song)) window.api.loadTrack(song, songs);
    }, [id, songs]);



    return (
        <>
                {songs.map((song, index) => (
                    <SongRow
                        key={song.id}
                        index={index}
                        song={song}
                        currentTrackId={id}
                        userPaused={userPaused}
                        pauseOrLoadSong={pauseOrLoadSong}
                        selectedRow={selectedRow}
                        setSelectedRow={setSelectedRow}
                    />
                ))}
        </>
    );
};
