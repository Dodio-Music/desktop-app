import s from "./Card.module.css";
import classNames from "classnames";

export default function CardSkeleton() {
    return (
        <div className={s.card}>
            <div className={s.coverWrapper}>
                <div className={classNames(s.coverWrapper, s.skeleton)} />
            </div>

            <div className={classNames(s.title, s.skeleton)} style={{marginBottom: "5px"}}>placeholder</div>
            <div className={classNames(s.artist, s.skeleton)}>placeholder</div>
        </div>
    );
}
