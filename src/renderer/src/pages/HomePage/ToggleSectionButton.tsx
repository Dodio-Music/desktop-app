import { FC } from "react";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import s from "./HomePage.module.css";

interface Props {
    expanded: boolean;
    onToggle: () => void;
}

const ToggleSectionButton: FC<Props> = ({ expanded, onToggle }) => (
    <button className={s.showHide} onClick={onToggle}>
        {expanded ? <>Hide All <IoIosArrowUp /></> : <>Show All <IoIosArrowDown /></>}
    </button>
);

export default ToggleSectionButton;
