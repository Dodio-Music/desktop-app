import {RemoteSongEntry} from "../../../../shared/TrackInfo";
import {PlaylistPreviewDTO} from "../../../../shared/Api";
import {ListItemIcon, ListItemText, MenuItem, Paper, Popper} from "@mui/material";
import {IoAddOutline} from "react-icons/io5";
import {useEffect, useState} from "react";
import {RiArrowDropRightFill} from "react-icons/ri";
import {errorToString} from "@renderer/util/errorToString";
import toast from "react-hot-toast";

interface AddToPlaylistMenuProps {
    song: RemoteSongEntry;
    closeParentMenu: () => void;
}

const AddToPlaylistMenu = ({closeParentMenu, song}: AddToPlaylistMenuProps) => {
    const [playlists, setPlaylists] = useState<PlaylistPreviewDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [submenuAnchor, setSubmenuAnchor] = useState<HTMLElement | null>(null);
    const [hoveringParent, setHoveringParent] = useState(false);
    const [hoveringSubmenu, setHoveringSubmenu] = useState(false);

    const open = hoveringParent || hoveringSubmenu;

    useEffect(() => {
        if (hoveringParent && playlists.length === 0 && !loading) {
            const fetchPlaylists = async () => {
                setLoading(true);
                const data = await window.api.authRequest<PlaylistPreviewDTO[]>("get", "/playlist/library/by-permission?permissions=ADD_SONG");
                if (data.type === "error") {
                    toast.error(errorToString(data.error));
                } else {
                    setPlaylists(data.value);
                }
                setLoading(false);
            };
            void fetchPlaylists();
        }

    }, [hoveringParent]);

    const handleAddToPlaylist = async (playlistId: number) => {
        closeParentMenu();
        const res = await window.api.authRequest("post", `/playlist/${playlistId}/song`, {releaseTrackId: song.releaseTrackId});
        if(res.type === "error") toast.error(errorToString(res.error));
        else toast.success("Song added.");
    };

    return (
        <>
            <MenuItem
                onMouseEnter={() => setHoveringParent(true)}
                onMouseLeave={() => setHoveringParent(false)}
                ref={setSubmenuAnchor}
                sx={{paddingRight: "50px"}}
            >
                <ListItemIcon><IoAddOutline size={22}/></ListItemIcon>
                <ListItemText primary="Add to Playlist"/>
                <ListItemIcon sx={{position: "absolute", right: 0, marginRight: "-5px"}}><RiArrowDropRightFill
                    size={34}/></ListItemIcon>
            </MenuItem>

            <Popper
                open={open}
                anchorEl={submenuAnchor}
                placement="right-start"
                disablePortal={false}
                sx={{zIndex: 10000}}
                modifiers={[
                    {name: "offset", options: {offset: [-4, 0]}}
                ]}
            >
                <Paper
                    onMouseEnter={() => setHoveringSubmenu(true)}
                    onMouseLeave={() => setHoveringSubmenu(false)}
                    elevation={8}
                    style={{pointerEvents: "auto", padding: "4px"}} sx={{minWidth: 100, maxWidth: 400}}>
                    {loading && <MenuItem disabled={true}>Loading...</MenuItem>}
                    {(!loading && playlists.length === 0) &&
                        <MenuItem disabled={true}>You don&#39;t own any playlists yet!</MenuItem>}
                    {playlists.map(p => (
                        <MenuItem key={p.playlistId} onClick={() => handleAddToPlaylist(p.playlistId)}>
                            <ListItemText
                                sx={{flex: 1, minWidth: 0, overflow: "hidden"}}
                                primary={p.playlistName}
                                slotProps={{primary: {noWrap: true}}}
                            />
                        </MenuItem>
                    ))}
                </Paper>
            </Popper>
        </>
    );
};

export default AddToPlaylistMenu;
