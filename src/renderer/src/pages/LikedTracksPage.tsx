import useFetchData from "@renderer/hooks/useFetchData";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import NothingFound from "@renderer/components/NothingFound/NothingFound";

const LikedTracksPage = () => {
    const {loading, error} = useFetchData<string>("/api/test");

    if(loading) return <LoadingPage/>;

    if(error) return <p>{error}</p>

    return (
        <div className={"pageWrapper pageWrapperFullHeight"}>
            <h1>Your Liked Tracks</h1>
            <NothingFound text={"You didn't like any tracks yet."}/>
        </div>
    );
};

export default LikedTracksPage;
