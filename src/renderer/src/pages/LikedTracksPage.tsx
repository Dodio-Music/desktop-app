import useAuthPage from "@renderer/hooks/useAuthPage";

const LikedTracksPage = () => {
    const {data, ControlPage} = useAuthPage<string>("/api/test");
    if(ControlPage) return <ControlPage/>

    return (
        <div>
            <h1>Tu amal was liken</h1>
            <p>Data: {data}</p>
        </div>
    );
};

export default LikedTracksPage;
