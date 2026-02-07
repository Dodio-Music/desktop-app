import s from "./NotificationsPage.module.css";
import FilterBar from "@renderer/components/FilterBar/FilterBar";
import {useState} from "react";
import classNames from "classnames";
import useFetchData from "@renderer/hooks/useFetchData";
import {NotificationDTO} from "../../../../shared/Api";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import CoverGrid from "@renderer/components/CoverGrid/CoverGrid";
import {format} from "timeago.js";
import {songCountPlural} from "@renderer/util/playlistUtils";
import {errorToString} from "@renderer/util/errorToString";
import toast from "react-hot-toast";

type FilterOption = "" | "INVITES" | "RELEASES";
type FilterEntry = { type: FilterOption, label: string };
const filterOptions: FilterEntry[] = [
    {type: "", label: "All"},
    {type: "INVITES", label: "Playlist Invites"},
    {type: "RELEASES", label: "New Releases"}
];

const NotificationsPage = () => {
    const [activeFilter, setActiveFilter] = useState<FilterOption>("");

    const {
        data,
        loading,
        error,
        refetch
    } = useFetchData<NotificationDTO>(`/notification/all?include=${activeFilter}`);

    if (loading) return <LoadingPage/>;

    const respondToInvite = async (inviteToken: string, accept: boolean) => {
        const res = await window.api.authRequest<string>("post", "/playlist/user/invite/respond", {inviteToken, accept});

        if(res.type === "error") {
            toast.error(errorToString(res.error));
        } else {
            toast.success(res.value);
        }

        refetch();
    }

    return (
        <div className={classNames("pageWrapper", s.page)}>
            <h1>Notifications</h1>
            <FilterBar
                options={filterOptions}
                value={activeFilter}
                onChange={setActiveFilter}
            />
            {error && <p className={"error"}>{error}</p>}
            {data && data.playlistNotifications.map(n =>
                <div key={n.inviteToken} className={s.notiContainer}>
                    <div className={s.seperator}/>
                    <div className={s.spaceBetween}>
                        <p>User <strong>{n.inviter.displayName}</strong> has invited you to:</p>
                        <p className={s.time}>{format(n.createdAt)}</p>
                    </div>
                    <div className={s.noti}>
                        <div className={s.left}>
                            <div className={s.cover}><CoverGrid coverArtUrls={n.playlistPreview.coverArtUrls}></CoverGrid></div>
                            <div className={s.playlistMeta}>
                                <p className={s.title}>{n.playlistPreview.playlistName}</p>
                                <p className={s.meta}>{songCountPlural(n.playlistPreview.songCount)}</p>
                                <p className={s.owner}>{n.playlistPreview.owner.displayName}</p>
                            </div>
                        </div>
                        <div className={s.right}>
                            <div className={s.buttons}>
                                <button className={s.accept} onClick={() => respondToInvite(n.inviteToken, true)}>Accept</button>
                                <button className={s.ignore} onClick={() => respondToInvite(n.inviteToken, false)}>Ignore</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
