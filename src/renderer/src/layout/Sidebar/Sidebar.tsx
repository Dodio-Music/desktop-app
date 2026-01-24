import s from "./sidebar.module.css";
import {PiMicrophoneStageBold} from "react-icons/pi";
import {BiAlbum, BiSolidPlaylist} from "react-icons/bi";
import {FaRegFolderOpen, FaRegHeart} from "react-icons/fa6";
import NavButton from "./NavButton/NavButton";
import React from "react";
import {VscAccount} from "react-icons/vsc";
import {MdOutlineLogin} from "react-icons/md";
import {AuthStatus} from "../../../../main/web/Typing";
import {useAuth} from "@renderer/hooks/reduxHooks";

const accountPages = {
    login: {url: "/login", text: "Sign In", icon: <MdOutlineLogin/>},
    signup: {url: "/signup", text: "Sign Up", icon: <MdOutlineLogin/>},
    account: {url: "/account", text: "Account Page", icon: <VscAccount/>},
} as const satisfies Record<AuthStatus, { url: string, text: string, icon: React.ReactElement }>;

const Sidebar = () => {
    const {info} = useAuth();
    const {url: accountUrl, text: accountText, icon: accountIcon} = accountPages[info.status];
    return (
        <div className={s.main}>
            <NavButton url={"/home"}>Home</NavButton>
            <p className={s.categoryTitle}>Collection</p>
            <div className={s.collection}>
                <NavButton url={"/collection/local"}><FaRegFolderOpen/><span>Local Files</span></NavButton>
                <NavButton url={"/collection/tracks"}><FaRegHeart/><span>Liked Tracks</span></NavButton>
                <NavButton url={"/collection/playlists"} id={s.playlist}><BiSolidPlaylist /><span>Playlists</span></NavButton>
                <NavButton url={"/collection/albums"}><BiAlbum id={s.album}/><span>Liked Albums</span></NavButton>
                <NavButton url={"/collection/artists"}><PiMicrophoneStageBold id={s.artist}/><span>Followed
                    Artists</span></NavButton>
                <NavButton url={accountUrl}>{accountIcon}<span>{accountText}</span></NavButton>
            </div>
        </div>
    );
};

export default Sidebar;
