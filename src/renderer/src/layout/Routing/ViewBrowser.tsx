import {Navigate, Route, Routes} from "react-router-dom";
import LikedArtistsPage from "../../pages/LikedArtistsPage";
import NotFoundPage from "../../pages/NotFoundPage";
import LikedAlbumsPage from "../../pages/LikedAlbumsPage";
import HomePage from "../../pages/HomePage/HomePage";
import LikedTracksPage from "../../pages/LikedTracksPage";
import LocalFilesPage from "../../pages/LocalFilesPage/LocalFilesPage";
import SignupPage from "@renderer/pages/account/SignupPage";
import LoginPage from "@renderer/pages/account/LoginPage";
import ProtectedRoute from "@renderer/components/ProtectedRoute";
import ReleaseView from "@renderer/pages/ReleaseView/ReleaseView";
import ForgotPassword from "@renderer/pages/account/ForgotPassword";
import UploadDashboard from "@renderer/pages/UploadDashboard/UploadDashboard";
import PlaylistPage from "@renderer/pages/PlaylistPage/PlaylistPage";
import PlaylistView from "@renderer/pages/PlaylistView/PlaylistView";
import NotificationsPage from "@renderer/pages/NotificationsPage/NotificationsPage";
import OverallSettings from "@renderer/pages/Settings/OverallSettings";
import AuthContentLayout from "@renderer/layout/Routing/AuthContentLayout";
import AppContentLayout from "@renderer/layout/Routing/AppContentLayout";
import RootLayout from "@renderer/layout/Routing/RootLayout";

const ViewBrowser = () => {
    return (
        <RootLayout>
            <Routes>
                <Route element={<AuthContentLayout/>}>
                    <Route path={"/login"} element={<LoginPage/>}/>
                    <Route path={"/signup"} element={<SignupPage/>}/>
                    <Route path={"/resetPassword"} element={<ForgotPassword/>}/>
                </Route>
                <Route element={<AppContentLayout/>}>
                    <Route path={"/"} element={<Navigate to={"/home"} replace/>}/>
                    <Route path={"/home"} element={<ProtectedRoute><HomePage/></ProtectedRoute>}/>
                    <Route path={"/dashboard"} element={<UploadDashboard/>}/>
                    <Route path={"/collection/local"} element={<LocalFilesPage/>}/>
                    <Route path={"/collection/tracks"}
                           element={<ProtectedRoute><LikedTracksPage/></ProtectedRoute>}/>
                    <Route path={"/collection/albums"}
                           element={<ProtectedRoute><LikedAlbumsPage/></ProtectedRoute>}/>
                    <Route path={"/collection/artists"}
                           element={<ProtectedRoute><LikedArtistsPage/></ProtectedRoute>}/>
                    <Route path={"/collection/playlists"}
                           element={<ProtectedRoute><PlaylistPage/></ProtectedRoute>}/>
                    <Route path={"/release/:id"} element={<ProtectedRoute><ReleaseView/></ProtectedRoute>}/>
                    <Route path={"/playlist/:id"} element={<ProtectedRoute><PlaylistView/></ProtectedRoute>}/>
                    <Route path={"/settings"} element={<OverallSettings/>}/>
                    <Route path={"/notifications"} element={<ProtectedRoute><NotificationsPage/></ProtectedRoute>}/>

                    <Route path={"*"} element={<NotFoundPage/>}/>
                </Route>
            </Routes>
        </RootLayout>
    );
};

export default ViewBrowser;
