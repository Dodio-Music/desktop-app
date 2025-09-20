import {Navigate, Route, Routes} from "react-router-dom";
import LikedArtistsPage from "../../pages/LikedArtistsPage";
import NotFoundPage from "../../pages/NotFoundPage";
import s from "./view_browser.module.css";
import LikedAlbumsPage from "../../pages/LikedAlbumsPage";
import HomePage from "../../pages/HomePage/HomePage";
import LikedTracksPage from "../../pages/LikedTracksPage";
import LocalFilesPage from "../../pages/LocalFilesPage/LocalFilesPage";

const ViewBrowser = () => {
    return (
        <div className={s.wrapper}>
            <Routes>
                <Route path={"/"} element={<Navigate to={"/collection/local"} replace/>}/>
                <Route path={"/home"} element={<HomePage/>}/>
                <Route path={"/collection/local"} element={<LocalFilesPage/>}/>
                <Route path={"/collection/tracks"} element={<LikedTracksPage/>}/>
                <Route path={"/collection/albums"} element={<LikedAlbumsPage/>}/>
                <Route path={"/collection/artists"} element={<LikedArtistsPage/>}/>
                <Route path={"*"} element={<NotFoundPage/>}/>
            </Routes>
        </div>
    );
};

export default ViewBrowser;
