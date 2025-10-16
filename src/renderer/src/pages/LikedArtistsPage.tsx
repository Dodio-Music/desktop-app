import {Navigate} from "react-router-dom";
import useAuthStatus from "@renderer/hooks/useAuthStatus";

const LikedArtistsPage = () => {
    const authStatus = useAuthStatus();

    if(authStatus === null) return <span>Loading...</span>
    if(authStatus !== "account") return <Navigate to={"/login?url=/collection/artists"} />

    return (
        <div>
            <h1>Musigg Leute denen du folgen tust</h1>
            <p>yuuuup</p>
        </div>
    );
};

export default LikedArtistsPage;
