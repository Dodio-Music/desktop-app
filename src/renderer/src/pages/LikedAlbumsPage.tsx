import NothingFound from "@renderer/components/NothingFound/NothingFound";

const LikedAlbumsPage = () => {
    return (
        <div className={"pageWrapper pageWrapperFullHeight"}>
            <h1>Your Liked Albums</h1>
            <NothingFound text={"You didn't like any albums yet."}/>
        </div>
    );
};

export default LikedAlbumsPage;
