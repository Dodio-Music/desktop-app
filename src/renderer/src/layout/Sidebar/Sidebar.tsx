import s from "./sidebar.module.css";
import {PiMicrophoneStageBold} from "react-icons/pi";
import {BiAlbum} from "react-icons/bi";
import {FaRegFolderOpen, FaRegHeart} from "react-icons/fa6";
import NavButton from "./NavButton/NavButton";
import {AuthStatus} from "../../../../shared/Api";
import React from "react";
import useAuthStatus from "@renderer/hooks/useAuthStatus";
import {VscAccount} from "react-icons/vsc";
import {MdOutlineLogin} from "react-icons/md";

const accountPages = {
    login: {url: "/login", text: "Sign In", icon: <MdOutlineLogin/> },
    signup: {url: "/signup", text: "Sign Up", icon: <MdOutlineLogin/> },
    account: {url: "/account", text: "Account Page", icon: <VscAccount/> },
} as const satisfies Record<AuthStatus, { url: string, text: string, icon: React.ReactElement }>;

const Sidebar = () => {
    const authStatus = useAuthStatus();
    const {url: accountUrl, text: accountText, icon: accountIcon} = accountPages[authStatus];
    return (
        <div className={s.main}>
            <NavButton url={"/home"}>Home</NavButton>
            <p className={s.category}>Collection</p>
            <div className={s.collection}>
                <NavButton url={"/collection/local"}><FaRegFolderOpen/>Local Files</NavButton>
                <NavButton url={"/collection/tracks"}><FaRegHeart/>Liked Tracks</NavButton>
                <NavButton url={"/collection/albums"}><BiAlbum id={s.album}/> Liked Albums</NavButton>
                <NavButton url={"/collection/artists"}><PiMicrophoneStageBold id={s.artist}/> Followed
                    Artists</NavButton>
                <NavButton url={accountUrl}>{accountIcon}{accountText}</NavButton>
            </div>
        </div>
    );
};

export default Sidebar;
