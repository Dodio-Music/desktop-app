import {FC, JSX, useEffect, useState} from "react";
import Popup from "@renderer/components/Popup/Popup";
import s from "./InvitePopup.module.css";
import {useDebounce} from "@uidotdev/usehooks";
import {InviteSearchResponse, UserPublicDTO} from "../../../../../../shared/Api";
import {errorToString} from "@renderer/util/errorToString";
import toast from "react-hot-toast";
import userIcon from "@renderer/../../../resources/dodo_whiteondark_256.png";
import {Tooltip} from "@mui/material";
import {FaUserPlus} from "react-icons/fa6";
import classNames from "classnames";
import useErrorHandling from "@renderer/hooks/useErrorHandling";

interface InvitePopupProps {
    open: boolean;
    onClose: () => void;
    playlistId: number;
    playlistUserUsernames: string[];
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

const InvitePopup: FC<InvitePopupProps> = ({open, onClose, playlistUserUsernames, playlistId}) => {
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 300);
    const {setError, InvalidInputError} = useErrorHandling();

    const [results, setResults] = useState<{ user: UserPublicDTO, invited: boolean }[]>([]);

    const inviteUser = async (username: string) => {
        const req = await window.api.authRequest<string>("post", "/playlist/user/invite", {
            playlistId: playlistId,
            inviteeUsername: username
        });
        if (req.type === "ok") {
            toast.success(req.value);
            void fetchUsers(debouncedQuery);
        } else {
            toast.error(errorToString(req.error));
        }
    };

    const fetchUsers = async (q: string) => {
        const res = await window.api.authRequest<InviteSearchResponse>(
            "get",
            `/account/search?q=${encodeURIComponent(q)}&playlistId=${playlistId}`
        );

        if (res.type !== "ok") {
            setResults([]);
            if (res.error.error === "invalid-input") setError(res.error);
            else toast.error(errorToString(res.error));
            return;
        }

        setError(null);

        const invitedSet = new Set(res.value.invitedUsers.map(u => u.username));

        setResults(
            res.value.users.map(user => ({
                user,
                invited: invitedSet.has(user.username)
            }))
        );
    };

    useEffect(() => {
        if (!open) return;

        void fetchUsers(debouncedQuery);
    }, [debouncedQuery, open]);

    return (
        <Popup open={open} onClose={onClose}>
            <h1>Invite to Playlist</h1>
            <div className={s.searchWrapper}>
                <label className={s.searchLabel}>Search for user</label>
                <input onChange={(e) => setQuery(e.currentTarget.value)} placeholder={"Search..."}
                       className={s.search}/>
                <InvalidInputError inputKey="search"/>
            </div>
            <div className={s.searchResultsWrapper}>
                <p className={s.found}>{results.length} result{results.length !== 1 && "s"} found.</p>
                <div className={s.searchResults}>
                    {results.map(u => {
                        const isMember = playlistUserUsernames?.includes(u.user.username) ?? false;

                        return (
                            <Tooltip key={u.user.username} placement={"top"}
                                     title={isMember ? "User is already a member of this playlist." : u.invited ? "You already invited this user to this playlist." : ""}>
                                <div
                                    className={classNames(s.userCard, (isMember || u.invited) && s.alreadyMember)}>
                                    <img alt={"User"} src={userIcon}/>
                                    <div className={s.cardMeta}>
                                        <p id={s.displayName}>
                                            {highlight(u.user.displayName, debouncedQuery)}
                                        </p>
                                        <p id={s.userName}>
                                            @{highlight(u.user.username, debouncedQuery)}
                                        </p>
                                    </div>
                                    {
                                        !(isMember || u.invited) &&
                                        <Tooltip placement={"right"} title={"Invite User"}>
                                            <button className={s.invite} onClick={() => inviteUser(u.user.username)}>
                                                <FaUserPlus/></button>
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
