import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import {SongRow} from "@renderer/pages/LocalFilesPage/SongRow";
import {BaseSongEntry, isLocalSong} from "../../../../shared/TrackInfo";

interface Props {
    songs: BaseSongEntry[];
    selectedRow?: string;
    setSelectedRow: (name?: string) => void;
}

export const SongList = ({songs, selectedRow, setSelectedRow}: Props) => {
    const {id, userPaused} = useSelector((root: RootState) => root.nativePlayer);

    const pauseOrLoadSong = (song: BaseSongEntry) => {
        if (song.id === id) {
            window.api.pauseOrResume();
        } else {
            if(isLocalSong(song)) window.api.loadTrack(song, songs);
        }
    };

    return (
        <>
            {songs.map((song, index) => (
                <SongRow
                    key={song.id}
                    index={index}
                    song={song}
                    selectedRow={selectedRow}
                    setSelectedRow={setSelectedRow}
                    currentTrackId={id}
                    userPaused={userPaused}
                    pauseOrLoadSong={pauseOrLoadSong}
                />
            ))}
        </>
    );
};
