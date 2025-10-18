import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import {SongEntry} from "@renderer/pages/LocalFilesPage/LocalFilesPage";
import {SongRow} from "@renderer/pages/LocalFilesPage/SongRow";

interface Props {
    songs: SongEntry[];
    selectedRow?: string;
    setSelectedRow: (name?: string) => void;
}

export const SongList = ({songs, selectedRow, setSelectedRow}: Props) => {
    const {currentTrack, userPaused} = useSelector((root: RootState) => root.nativePlayer);

    const pauseOrLoadSong = (song: SongEntry) => {
        if (song.fullPath === currentTrack) {
            window.api.pauseOrResume();
        } else {
            window.api.loadTrack(song.fullPath);
        }
    };

    return (
        <>
            {songs.map((song, index) => (
                <SongRow
                    key={song.fullPath}
                    index={index}
                    song={song}
                    selectedRow={selectedRow}
                    setSelectedRow={setSelectedRow}
                    currentTrack={currentTrack}
                    userPaused={userPaused}
                    pauseOrLoadSong={pauseOrLoadSong}
                />
            ))}
        </>
    );
};
