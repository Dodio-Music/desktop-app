import s from "./sidebar.module.css";
import {PiMicrophoneStageBold} from "react-icons/pi";
import {BiAlbum} from "react-icons/bi";
import {FaRegFolderOpen, FaRegHeart} from "react-icons/fa6";
import NavButton from "./NavButton/NavButton";

const Sidebar = () => {
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
                <NavButton url={"/collection/login"}><PiMicrophoneStageBold/> Followed
                    Artists</NavButton>
            </div>
        </div>
    );
};

export default Sidebar;
