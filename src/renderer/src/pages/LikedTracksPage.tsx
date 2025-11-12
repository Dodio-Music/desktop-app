import useFetchData from "@renderer/hooks/useFetchData";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";

const LikedTracksPage = () => {
    const {data, loading, error} = useFetchData<string>("/api/test");

    if(loading) return <LoadingPage/>;

    if(error) return <p>{error}</p>

    return (
        <div className={"pageWrapper"}>
            <h1>Tu amal was liken</h1>
            <p>Data: {data}</p>
        </div>
    );
};

export default LikedTracksPage;
