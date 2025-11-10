import s from "./sidebar.module.css";
import {PiMicrophoneStageBold} from "react-icons/pi";
import {BiAlbum} from "react-icons/bi";
import {FaRegFolderOpen, FaRegHeart} from "react-icons/fa6";
import NavButton from "./NavButton/NavButton";
import {AuthStatus} from "../../../../shared/Api";
import React from "react";
import {VscAccount} from "react-icons/vsc";
import {MdOutlineLogin} from "react-icons/md";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";

const accountPages = {
    login: {url: "/login", text: "Sign In", icon: <MdOutlineLogin/> },
    signup: {url: "/signup", text: "Sign Up", icon: <MdOutlineLogin/> },
    account: {url: "/account", text: "Account Page", icon: <VscAccount/> },
} as const satisfies Record<AuthStatus, { url: string, text: string, icon: React.ReactElement }>;

const Sidebar = () => {
    const {status} = useSelector((state: RootState) => state.auth);
    const {url: accountUrl, text: accountText, icon: accountIcon} = accountPages[status];
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
