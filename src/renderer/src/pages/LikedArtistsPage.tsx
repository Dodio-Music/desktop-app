import useAuthPage from "@renderer/hooks/useAuthPage";

const LikedArtistsPage = () => {
    const {data, ControlPage} = useAuthPage<string>("/api/test");
    if(ControlPage) return <ControlPage/>

    return (
        <div>
            <h1>Musigg Leute denen du folgen tust</h1>
            <p>yuuuup</p>
            <p>Data: {data}</p>
        </div>
    );
};

export default LikedArtistsPage;
