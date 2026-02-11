import {PlaylistRole} from "../../../../shared/Api";
import {useEffect, useRef} from "react";
import toast from "react-hot-toast";
import {toCapitalized} from "@renderer/util/playlistUtils";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import {useNavigate} from "react-router-dom";

export function useNotifyPlaylistChange(role?: PlaylistRole) {
    const navigate = useNavigate();
    const kicked = useSelector((state: RootState) => state.playlistSlice.kicked);
    const prevRoleRef = useRef<typeof role | null>(null);

    useEffect(() => {
        if (!kicked) return;

        toast.error("You were removed from this playlist.");
        navigate("/collection/playlists", { replace: true });
    }, [kicked, navigate]);

    useEffect(() => {
        if (!role) return;

        const prev = prevRoleRef.current;
        if (prev && prev !== role) {
            toast.success(`The playlist owner changed your role to ${toCapitalized(role)}.`);
        }

        prevRoleRef.current = role;
    }, [role]);
}
