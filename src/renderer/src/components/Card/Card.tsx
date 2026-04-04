import {JSX, memo, MouseEvent} from "react";
import s from "./Card.module.css";
import {FaPause, FaPlay} from "react-icons/fa6";
import CoverGrid from "@renderer/components/CoverGrid/CoverGrid";

interface CardEntity {
    id: number | string;
    name: string;
}

interface CardProps<T> {
    data: T;
    isPlaying: boolean;
    onClick: (data: T) => void;
    onContextMenu: (e: MouseEvent, item: T) => void;
    onIconClick: (e: MouseEvent, item: T) => void;
    onArtistClick?: (artist: CardEntity) => void;

    artistType?: "artist" | "user";

    getTitle: (data: T) => string;
    getArtists?: (data: T) => CardEntity[];
    getCoverUrl: (data: T) => string;
    getTiledCovers?: (data: T) => string[] | undefined;
}

function CardComponent<T>({data, onArtistClick, isPlaying, onClick, onContextMenu, onIconClick, artistType = "user", getTitle, getCoverUrl, getArtists, getTiledCovers}: CardProps<T>) {
    const covers = getTiledCovers?.(data);
    const img = covers ?
        <CoverGrid coverArtUrls={covers}/>
        :
        <img alt="cover" className={s.cover} src={`${getCoverUrl(data)}?size=low`} loading="lazy"/>

    return (
        <div className={s.card} onClick={() => onClick(data)} onContextMenu={(e) => onContextMenu(e, data)}>
            <div className={s.coverWrapper}>
                {img}
                <button className={s.play} onClick={(e) => onIconClick(e, data)}>
                    {isPlaying ?
                        <FaPause size={24} className={s.pauseIcon}/>
                        :
                        <FaPlay size={24} className={s.playIcon}/>
                    }
                </button>
            </div>
            <p className={`${s.title}`}>{getTitle(data)}</p>
            <p className={s.artist}>{getArtists?.(data).map((a, i, arr) => (
                <span onClick={(e) => {
                    e.stopPropagation();
                    onArtistClick?.(a);
                }} key={a.id}>
                    <span className={artistType === "artist" ? s.link : ""}>
                        {a.name}
                    </span>{i < arr.length - 1 ? ", " : ""}
                </span>
            ))}</p>
        </div>
    );
}

const Card = memo(CardComponent) as <T>(
    props: CardProps<T>
) => JSX.Element;

export default Card;
