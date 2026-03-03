import {useAppSelector} from "@renderer/redux/store";

export const useAuth = () => {
    return useAppSelector(state => state.auth);
};
