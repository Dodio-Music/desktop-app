import {Navigate, Route, Routes} from "react-router-dom";
import LikedArtistsPage from "../../pages/LikedArtistsPage";
import NotFoundPage from "../../pages/NotFoundPage";
import s from "./view_browser.module.css";
import LikedAlbumsPage from "../../pages/LikedAlbumsPage";
import HomePage from "../../pages/HomePage/HomePage";
import LikedTracksPage from "../../pages/LikedTracksPage";
import LocalFilesPage from "../../pages/LocalFilesPage/LocalFilesPage";
import SignupPage from "@renderer/pages/account/SignupPage";
import AccountPage from "@renderer/pages/account/AccountPage";
import LoginPage from "@renderer/pages/account/LoginPage";
import SettingsPage from "@renderer/pages/Settings/SettingsPage";
import ProtectedRoute from "@renderer/components/ProtectedRoute";
import ReleaseView from "@renderer/pages/ReleaseView/ReleaseView";

const ViewBrowser = () => {
    return (
        <div className={s.wrapper}>
            <Routes>
                <Route path={"/"} element={<Navigate to={"/collection/local"} replace/>}/>
                <Route path={"/home"} element={<ProtectedRoute redirect={false}><HomePage/></ProtectedRoute>}/>
                <Route path={"/settings"} element={<SettingsPage/>}/>
                <Route path={"/collection/local"} element={<LocalFilesPage/>}/>
                <Route path={"/collection/tracks"} element={<ProtectedRoute><LikedTracksPage/></ProtectedRoute>}/>
                <Route path={"/collection/albums"} element={<ProtectedRoute><LikedAlbumsPage/></ProtectedRoute>}/>
                <Route path={"/collection/artists"} element={<ProtectedRoute><LikedArtistsPage/></ProtectedRoute>}/>
                <Route path={"/release/:id"} element={<ProtectedRoute><ReleaseView/></ProtectedRoute>}/>
                <Route path={"/login"} element={<LoginPage/>}/>
                <Route path={"/signup"} element={<SignupPage/>}/>
                <Route path={"/account"} element={<ProtectedRoute><AccountPage/></ProtectedRoute>}/>
                <Route path={"*"} element={<NotFoundPage/>}/>
            </Routes>
        </div>
    );
};

export default ViewBrowser;
