import useAuthPage from "@renderer/hooks/useAuthPage";

const LikedAlbumsPage = () => {
    const {data, ControlPage} = useAuthPage<string>("/api/test");
    if(ControlPage) return <ControlPage/>;

    return (
        <div>
            <h1>Your liked albums idk</h1>
            <p>Data: {data}</p>
        </div>
    );
};

export default LikedAlbumsPage;
