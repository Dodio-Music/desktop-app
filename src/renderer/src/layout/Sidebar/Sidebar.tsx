import s from "./sidebar.module.css";
import {PiMicrophoneStageBold} from "react-icons/pi";
import {BiAlbum, BiSolidPlaylist} from "react-icons/bi";
import {FaRegFolderOpen, FaRegHeart} from "react-icons/fa6";
import NavButton from "./NavButton";
import React, {FC, useEffect, useState} from "react";
import {MdOutlineLogin} from "react-icons/md";
import {AuthStatus} from "../../../../main/web/Typing";
import {useAuth} from "@renderer/hooks/reduxHooks";
import {FaHome, FaRegUserCircle} from "react-icons/fa";
import classNames from "classnames";
import {generalPlural} from "@renderer/util/playlistUtils";

interface NavItem {
    url: string;
    label: string;
    subLabel?: string;
    icon?: React.ReactElement;
    iconId?: string;
    needsAccount: boolean;
}

const accountPages = {
    login: {url: "/login", text: "Sign In", icon: <MdOutlineLogin/>},
    signup: {url: "/signup", text: "Sign Up", icon: <MdOutlineLogin/>},
    account: {url: "/settings?tab=account", text: "Account Page", icon: <FaRegUserCircle />}
} as const satisfies Record<AuthStatus, { url: string, text: string, icon: React.ReactElement }>;

interface ItemHelper {
    localSongsCount: number;
}

const navItems = ({localSongsCount}: ItemHelper): NavItem[] => [
    {
        url: "/home",
        label: "Home",
        icon: <FaHome/>,
        needsAccount: false
    },
    {
        url: "/collection/local",
        label: "Local Files",
        subLabel: `${localSongsCount} song${generalPlural(localSongsCount)}`,
        icon: <FaRegFolderOpen/>,
        needsAccount: false
    },
    {
        url: "/collection/tracks",
        label: "Liked Songs",
        icon: <FaRegHeart/>,
        needsAccount: true
    },
    {
        url: "/collection/playlists",
        label: "Playlists",
        icon: <BiSolidPlaylist/>,
        needsAccount: true
    },
    {
        url: "/collection/albums",
        label: "Liked Albums",
        icon: <BiAlbum id={s.album} />,
        needsAccount: true
    },
    {
        url: "/collection/artists",
        label: "Followed Artists",
        icon: <PiMicrophoneStageBold id={s.artist}/>,
        needsAccount: true
    }
];

interface SidebarProps {
    isCollapsed: boolean;
}

const Sidebar: FC<SidebarProps> = ({isCollapsed}) => {
    const {info} = useAuth();
    const {url: accountUrl, text: accountText, icon: accountIcon} = accountPages[info.status];
    const [localSongsCount, setLocalSongsCount] = useState(0);

    useEffect(() => {
        async function fetchCount() {
            const count = await window.api.getLocalSongCount();
            setLocalSongsCount(count);
        }

        void fetchCount();

        const unsub = window.api.onLocalSongCount(setLocalSongsCount);
        return () => {
            unsub();
        }
    }, []);

    return (
        <div className={classNames(s.main, isCollapsed && s.isCollapsed)}>
            {navItems({localSongsCount}).filter(c => !c.needsAccount || info.status === "account").map((item) => (
                <NavButton key={item.url} url={item.url}>
                    {item.icon}
                    {!isCollapsed &&
                        <div className={s.name}>
                            <span className={s.label}>{item.label}</span>
                            <span className={s.subLabel}>{item.subLabel}</span>
                        </div>
                    }
                </NavButton>
            ))}
            <NavButton url={accountUrl}>{accountIcon}{!isCollapsed && <span className={s.label}>{accountText}</span>}</NavButton>
        </div>
    );
};

export default Sidebar;
