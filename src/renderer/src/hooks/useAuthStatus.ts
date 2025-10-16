import {store} from "@renderer/redux/store";

const useAuthStatus = () => store.getState().auth;

export default useAuthStatus;
