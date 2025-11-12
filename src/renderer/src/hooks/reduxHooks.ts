import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";

export const useAuth = () => {
    return useSelector((state: RootState) => state.auth);
};
