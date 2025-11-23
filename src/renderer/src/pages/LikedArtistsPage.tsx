import NothingFound from "@renderer/components/NothingFound/NothingFound";

const LikedArtistsPage = () => {
    return (
        <div className={"pageWrapper"}>
            <h1>Artists You Follow</h1>
            <NothingFound text={"You don't follow any artists yet."}/>
        </div>
    );
};

export default LikedArtistsPage;
