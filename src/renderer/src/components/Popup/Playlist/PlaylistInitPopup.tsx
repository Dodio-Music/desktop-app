import Popup from "@renderer/components/Popup/Popup";
import s from "@renderer/pages/PlaylistPage/PlaylistPage.module.css";
import classNames from "classnames";
import {Tooltip} from "@mui/material";
import {RiInformation2Fill} from "react-icons/ri";
import {FC, FormEvent, useEffect, useRef, useState} from "react";
import Switch from "react-switch";
import toast from "react-hot-toast";
import {errorToString} from "@renderer/util/errorToString";
import useErrorHandling from "@renderer/hooks/useErrorHandling";
import {ApiResult} from "../../../../../shared/Api";

interface PlaylistInitPopupProps {
    open: boolean;
    close: () => void;
    refetch: () => void;

    title: string;
    submitLabel: string;

    initialName?: string;
    initialPublic?: boolean;

    playlistId?: number;

    onSubmit: (data: { playlistName: string, public: boolean, playlistId?: number }) => Promise<ApiResult<string>>;
}

const PlaylistInitPopup: FC<PlaylistInitPopupProps> = ({
                                                           open,
                                                           close,
                                                           refetch,
                                                           onSubmit,
                                                           submitLabel,
                                                           initialPublic,
                                                           initialName,
                                                           title,
                                                           playlistId
                                                       }) => {
    const [playlistName, setPlaylistName] = useState<string>("");
    const [isPublic, setIsPublic] = useState(false);
    const [creationRequestActive, setCreationRequestActive] = useState(false);

    const playlistNameInputRef = useRef<HTMLInputElement>(null);
    const {setError, InvalidInputError, hasError} = useErrorHandling();

    useEffect(() => {
        if (!open) return;

        setPlaylistName(initialName ?? "");
        setIsPublic(initialPublic ?? false);

        requestAnimationFrame(() => {
            playlistNameInputRef.current?.focus();
        });
    }, [open, initialName, initialPublic]);

    const onSubmitCreate = async (e: FormEvent) => {
        e.preventDefault();
        if (!playlistName || creationRequestActive) return;

        setCreationRequestActive(true);

        const res = await onSubmit({playlistName, public: isPublic, playlistId});
        if (res.type === "error") {
            if (res.error.error === "invalid-input") setError(res.error);
            else toast.error(errorToString(res.error));
        } else {
            setPlaylistName("");
            setIsPublic(false);
            close();
            toast.success(res.value);
            refetch();
        }

        setCreationRequestActive(false);
    };

    return (
        <div>
            {<Popup
                open={open}
                onClose={() => close()}
                className={s.popup}
                as={"form"}
                onSubmit={onSubmitCreate}
            >
                <h1>{title}</h1>
                <div className={s.options}>
                    <div className={classNames(s.option, hasError("playlistName") && "error")}>
                        <label>Playlist Name</label>
                        <input ref={playlistNameInputRef} placeholder={"My Playlist #1"} className={s.nameInput}
                               value={playlistName}
                               onChange={e => setPlaylistName(e.currentTarget.value)}/>
                        <InvalidInputError inputKey={"playlistName"}/>
                    </div>
                    <div className={s.option}>
                        <div className={s.horiz}>
                            <p>Public Playlist</p>
                            <Tooltip
                                title={"Public playlists can be discovered by anyone. Private playlists are restricted to invited members only."}>
                                <RiInformation2Fill className={s.info} size={22}/>
                            </Tooltip>
                            <Switch handleDiameter={20} width={46} onColor={"#2580e1"} offColor={"#535353"}
                                    height={22}
                                    checked={isPublic} onChange={(checked) => setIsPublic(checked)}/>
                        </div>
                    </div>
                    <p className={s.titleInfo}>(These can always be changed later.)</p>
                </div>
                <button disabled={!playlistName}
                        className={classNames(s.finalCreate, creationRequestActive && s.creating)}>{submitLabel}
                </button>
            </Popup>}
        </div>
    );
};

export default PlaylistInitPopup;
