import {FC} from "react";
import Popup from "@renderer/components/Popup/Popup";
import {PlaylistUserDTO} from "../../../../../../shared/Api";
import s from "./MembersPopup.module.css";
import si from "../InvitePopup/InvitePopup.module.css";
import userIcon from "../../../../../../../resources/dodo_whiteondark_256.png";

interface InvitePopupProps {
    open: boolean;
    onClose: () => void;
    playlistUsers: PlaylistUserDTO[];
}

const MembersPopup: FC<InvitePopupProps> = ({open, onClose, playlistUsers}) => {

    return (
        <Popup open={open} onClose={onClose}>
            <h1>Playlist Members</h1>
            <div className={si.searchResults} style={{maxHeight: "350px", marginTop: "5px"}}>
                {playlistUsers.map(u =>
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
                        <div className={s.role}>{u.role.substring(0, 1) + u.role.toLowerCase().substring(1)}</div>
                    </div>
                )}
            </div>
        </Popup>
    );
};

export default MembersPopup;
