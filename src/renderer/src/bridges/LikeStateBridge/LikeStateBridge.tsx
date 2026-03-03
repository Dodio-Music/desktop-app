import { useAppDispatch, useAppSelector} from "@renderer/redux/store";
import {useEffect} from "react";
import {fetchLikedState, resetLikes} from "@renderer/redux/likeSlice";

const LikeStateBridge = () => {
    const accountStatus = useAppSelector(state => state.auth.info.status);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (accountStatus === "no_account") {
            dispatch(resetLikes());
        } else {
            dispatch(fetchLikedState());
        }
    }, [accountStatus, dispatch]);

    return null;
};

export default LikeStateBridge;
