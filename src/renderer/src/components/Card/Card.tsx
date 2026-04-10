import {JSX, memo, MouseEvent, ReactNode} from "react";
import s from "./Card.module.css";
import {FaPause, FaPlay} from "react-icons/fa6";
import CoverGrid from "@renderer/components/CoverGrid/CoverGrid";
import {useNavigate} from "react-router-dom";
import {ReleaseType} from "../../../../shared/Api";
import {toCapitalized} from "@renderer/util/playlistUtils";

interface CardEntity {
    id: string | number;
    name: string;
    navigateTo?: string;
}

interface ReleaseInfo {
    releaseYear: number;
    releaseType: ReleaseType;
}

interface CardProps {
    isPlaying?: boolean;
    onClick?: () => void;
    onContextMenu?: (e: MouseEvent) => void;
    onPlayClick?: (e: MouseEvent) => void;

    title?: ReactNode;
    entities?: CardEntity[];
    releaseInfo?: ReleaseInfo;

    coverUrl: string;
    tiledCovers?: string[] | undefined;
}

function CardComponent({isPlaying, onClick, onContextMenu, onPlayClick, coverUrl, tiledCovers, title, entities, releaseInfo}: CardProps) {
    const img = tiledCovers ?
        <CoverGrid coverArtUrls={tiledCovers}/>
        :
        <img alt="cover" className={s.cover} src={`${coverUrl}?size=low`} loading="lazy"/>

    const navigate = useNavigate();

    return (
        <div className={s.card} onClick={onClick} onContextMenu={onContextMenu}>
            <div className={s.coverWrapper}>
                {img}
                <button className={s.play} onClick={onPlayClick}>
                    {isPlaying !== undefined && isPlaying ? <FaPause size={24} className={s.pauseIcon}/> : <FaPlay size={24} className={s.playIcon}/>}
                </button>
            </div>
            {title && <p className={`${s.title}`}>{title}</p>}
            {entities && <p className={s.artist}>{entities.map((a, i, arr) => (
                <span onClick={(e) => {
                    if(a.navigateTo) {
                        e.stopPropagation();
                        navigate(a.navigateTo);
                    }
                }} key={a.id}>
                    <span className={a.navigateTo ? s.link : ""}>
                        {a.name}
                    </span>{i < arr.length - 1 ? ", " : ""}
                </span>
            ))}</p>}
            {releaseInfo && <p className={`${s.artist}`}>{releaseInfo.releaseYear} · {toCapitalized(releaseInfo.releaseType)}</p>}
        </div>
    );
}

const Card = memo(CardComponent) as (
    props: CardProps
) => JSX.Element;

export default Card;
