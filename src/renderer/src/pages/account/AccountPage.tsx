import {Navigate, useNavigate} from "react-router-dom";
import useAuthStatus from "@renderer/hooks/useAuthStatus";
import {MdOutlineLogout} from "react-icons/md";

const AccountPage = () => {
    const isLoggedIn = useAuthStatus() === "account";
    const navigate = useNavigate();

    if(isLoggedIn === null) return <p>Loading...</p>
    if(!isLoggedIn) return <Navigate to={"/login?url=/account"}/>

    return (
        <div>
            <h1>Account page</h1>
            <p>heres account data</p>
            <button onClick={()=> window.api.logout().then(() => navigate("/login?url=/account"))}><MdOutlineLogout/> Logout</button>
        </div>
    );
};

export default AccountPage;
