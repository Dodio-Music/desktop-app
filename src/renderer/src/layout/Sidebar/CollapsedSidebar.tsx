import s from "./collapsed_sidebar.module.css";
import {PiMicrophoneStageBold} from "react-icons/pi";
import {BiAlbum, BiCollection} from "react-icons/bi";
import {FaRegFolderOpen, FaRegHeart} from "react-icons/fa6";
import NavButton from "./NavButton/NavButton";
import {AuthStatus} from "../../../../shared/Api";
import React from "react";
import {VscAccount} from "react-icons/vsc";
import {MdOutlineLogin} from "react-icons/md";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import {FaHome} from "react-icons/fa";

const accountPages = {
    login: {url: "/login", text: "Sign In", icon: <MdOutlineLogin/> },
    signup: {url: "/signup", text: "Sign Up", icon: <MdOutlineLogin/> },
    account: {url: "/account", text: "Account Page", icon: <VscAccount/> },
} as const satisfies Record<AuthStatus, { url: string, text: string, icon: React.ReactElement }>;

const Sidebar = () => {
    const {status} = useSelector((state: RootState) => state.auth);
    const {url: accountUrl, icon: accountIcon} = accountPages[status];

    return (
        <div className={s.main}>
            <NavButton url={"/home"}><FaHome/></NavButton>

            <div className={s.category}>
                <div className={s.collectionHeader}>
                    <BiCollection/>
                </div>
                <div className={s.collection}>
                    <NavButton url={"/collection/local"}><FaRegFolderOpen scale={10}/></NavButton>
                    <NavButton url={"/collection/tracks"}><FaRegHeart/></NavButton>
                    <NavButton url={"/collection/albums"}><BiAlbum id={s.album}/></NavButton>
                    <NavButton url={"/collection/artists"}><PiMicrophoneStageBold id={s.artist}/></NavButton>
                    <NavButton url={accountUrl}>{accountIcon}</NavButton>
                </div>
            </div>

        </div>
    );
};

export default Sidebar;
