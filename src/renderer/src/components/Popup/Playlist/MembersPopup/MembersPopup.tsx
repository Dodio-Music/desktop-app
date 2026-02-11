import {FC, useState, MouseEvent} from "react";
import Popup from "@renderer/components/Popup/Popup";
import {PlaylistUserDTO} from "../../../../../../shared/Api";
import s from "./MembersPopup.module.css";
import si from "../InvitePopup/InvitePopup.module.css";
import userIcon from "../../../../../../../resources/dodo_whiteondark_256.png";
import {IoIosArrowDown, IoIosArrowUp} from "react-icons/io";
import {ContextMenu} from "@renderer/contextMenus/ContextMenu";
import {useContextMenu} from "@renderer/hooks/useContextMenu";
import {renderEntityActions} from "@renderer/contextMenus/menuHelper";
import classNames from "classnames";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import {toCapitalized} from "@renderer/util/playlistUtils";

interface InvitePopupProps {
    open: boolean;
    onClose: () => void;
    currentUser?: PlaylistUserDTO;
    playlistId: number;
}

const MembersPopup: FC<InvitePopupProps> = ({open, onClose, currentUser, playlistId}) => {
    const ctx = useContextMenu(() => setExpandedUser(""));
    const [expandedUser, setExpandedUser] = useState("");
    const users = useSelector((state: RootState) => state.playlistSlice.users);

    const handleUserClick = (e: MouseEvent, u: PlaylistUserDTO) => {
        e.stopPropagation();

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        ctx.open(
            e,
            {type: "playlistUser", data: u},
            {
                clientX: rect.left - 35,
                clientY: rect.bottom + 10
            }
        );
        setExpandedUser(u.user.username);
    };

    return (
        <>
            <Popup open={open} onClose={onClose}>
                <h1>Playlist Members</h1>
                <div className={si.searchResults} style={{maxHeight: "350px", marginTop: "5px"}}>
                    {users.map(u => {
                        const canEdit = currentUser?.role === "OWNER" && u.role !== "OWNER";

                        return (
                            <div key={u.user.username} className={si.userCard}>
                                <img alt={"User"} src={userIcon}/>
                                <div className={si.cardMeta}>
                                    <p id={si.displayName}>
                                        {u.user.displayName}
                                    </p>
                                    <p id={si.userName}>
                                        @{u.user.username}
                                    </p>
                                </div>
                                <div onClick={(e) => canEdit && handleUserClick(e, u)}
                                     className={classNames(s.role, canEdit && s.changeable)}>{toCapitalized(u.role)}
                                    {
                                        canEdit && (
                                            expandedUser === u.user.username ?
                                                <IoIosArrowUp/> : <IoIosArrowDown/>
                                        )
                                    }
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Popup>
            {
                <ContextMenu ctx={ctx}>
                    {
                        ctx.state && renderEntityActions(ctx.state.target, ctx.close, {playlistId: playlistId})
                    }
                </ContextMenu>
            }
        </>
    );
};

export default MembersPopup;
