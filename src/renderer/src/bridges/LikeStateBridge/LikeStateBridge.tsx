import {useDispatch, useSelector} from "react-redux";
import {AppDispatch, RootState} from "@renderer/redux/store";
import {useEffect} from "react";
import {fetchLikedState, resetLikes} from "@renderer/redux/likeSlice";

const LikeStateBridge = () => {
    const accountStatus = useSelector((state: RootState) => state.auth.info.status);
    const dispatch = useDispatch<AppDispatch>();

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
