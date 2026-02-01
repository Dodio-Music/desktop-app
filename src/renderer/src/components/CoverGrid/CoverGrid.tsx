import {FC} from "react";
import s from "./CoverGrid.module.css";

interface CoverGridProps {
    coverArtUrls: string[];
}

const CoverGrid: FC<CoverGridProps> = ({coverArtUrls}) => {
    if(coverArtUrls.length < 4) return <img alt={"Cover"} src={coverArtUrls[0] + "?size=low"}/>

    return (
        <div className={s.grid}>
            {coverArtUrls.map(c => <img alt={"Cover"} key={c} src={c + "?size=low"}/>)}
        </div>
    );
};

export default CoverGrid;
