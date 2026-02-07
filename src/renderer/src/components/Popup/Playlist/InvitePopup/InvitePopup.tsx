import {FC, JSX, useEffect, useState} from "react";
import Popup from "@renderer/components/Popup/Popup";
import s from "./InvitePopup.module.css";
import {useDebounce} from "@uidotdev/usehooks";
import {UserPublicDTO} from "../../../../../../shared/Api";
import {errorToString} from "@renderer/util/errorToString";
import toast from "react-hot-toast";
import userIcon from "@renderer/../../../resources/dodo_whiteondark_256.png";
import {Tooltip} from "@mui/material";
import {FaUserPlus} from "react-icons/fa6";
import classNames from "classnames";

interface InvitePopupProps {
    open: boolean;
    onClose: () => void;
    playlistId: number;
    playlistUserUsernames: string[];
    currentUserUsername?: string;
}

function highlight(text: string, query: string): JSX.Element {
    if (!query.trim()) return <>{text}</>;

    const tokens = query
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    if (!tokens.length) return <>{text}</>;

    const regex = new RegExp(`(${tokens.join("|")})`, "ig");
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark key={i}>{part}</mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
}

const InvitePopup: FC<InvitePopupProps> = ({open, onClose, currentUserUsername, playlistUserUsernames, playlistId}) => {
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 300);

    const [results, setResults] = useState<UserPublicDTO[]>([]);

    const inviteUser = async (username: string) => {
        const req = await window.api.authRequest<string>("post", "/playlist/user/invite", {playlistId: playlistId, inviteeUsername: username})
        if(req.type === "ok") {
            toast.success(req.value);
        } else {
            toast.error(errorToString(req.error));
        }
    }

    useEffect(() => {
        if (!open) return;

        let cancelled = false;
        (async () => {

            const res = await window.api.authRequest<UserPublicDTO[]>(
                "get",
                `/account/search?searchString=${encodeURIComponent(debouncedQuery)}`
            );

            if (cancelled) return;

            if (res.type === "ok") {
                const filteredResults = res.value.filter(u => u.username !== currentUserUsername);
                setResults(filteredResults);
            } else {
                toast.error(errorToString(res.error));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [debouncedQuery, open]);

    return (
        <Popup open={open} onClose={onClose}>
            <h1>Invite to Playlist</h1>
            <div className={s.searchWrapper}>
                <label className={s.searchLabel}>Search for user</label>
                <input onChange={(e) => setQuery(e.currentTarget.value)} placeholder={"Search..."}
                       className={s.search}/>
            </div>
            <div className={s.searchResultsWrapper}>
                <p className={s.found}>{results.length} result{results.length !== 1 && "s"} found.</p>
                <div className={s.searchResults}>
                    {results.map(u => {
                        const isMember = playlistUserUsernames?.includes(u.username) ?? false;

                        return (
                            <Tooltip key={u.username} placement={"top"}
                                     title={isMember ? "User is already a member of this playlist." : ""}>
                                <div
                                    className={classNames(s.userCard, isMember && s.alreadyMember)}>
                                    <img alt={"User"} src={userIcon}/>
                                    <div className={s.cardMeta}>
                                        <p id={s.displayName}>
                                            {highlight(u.displayName, debouncedQuery)}
                                        </p>
                                        <p id={s.userName}>
                                            @{highlight(u.username, debouncedQuery)}
                                        </p>
                                    </div>
                                    {
                                        !isMember &&
                                        <Tooltip placement={"right"} title={"Invite User"}>
                                            <button className={s.invite} onClick={() => inviteUser(u.username)}><FaUserPlus/></button>
                                        </Tooltip>
                                    }
                                </div>
                            </Tooltip>
                        );
                    })}
                </div>
            </div>
        </Popup>
    );
};

export default InvitePopup;
