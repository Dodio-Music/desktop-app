import {memo, MouseEvent} from "react";
import s from "./HomePage.module.css";
import {ReleasePreviewDTO} from "../../../../shared/Api";
import {FaPause, FaPlay} from "react-icons/fa6";


interface ReleaseCardProps {
    release: ReleasePreviewDTO;
    isPlaying: boolean | null;
    onClick: (release: ReleasePreviewDTO) => void;
    onContextMenu: (e: MouseEvent, release: ReleasePreviewDTO) => void;
    onIconClick: (e: MouseEvent, release: ReleasePreviewDTO) => void;
}

const ReleaseCard = memo(({release, isPlaying, onClick, onContextMenu, onIconClick}: ReleaseCardProps) => {
    return (
        <div className={s.release} onClick={() => onClick(release)} onContextMenu={(e) => onContextMenu(e, release)}>
            <div className={s.coverWrapper}>
                <img alt="cover" className={s.cover} src={`${release.coverArtUrl}?size=low`} loading="lazy"/>
                <button className={s.play} onClick={(e) => onIconClick(e, release)}>
                                 {isPlaying ?
                                     <FaPause size={24} className={s.pauseIcon}/>
                                     :
                                     <FaPlay size={24} className={s.playIcon}/>
                                 }
                             </button>
            </div>
            <p className={`${s.title} ${s.link}`}>{release.releaseName}</p>
            <p className={`${s.artist} ${s.link}`}>{release.artists.join(", ")}</p>
        </div>
    );
});

ReleaseCard.displayName = "ReleaseCard";

export default ReleaseCard;
