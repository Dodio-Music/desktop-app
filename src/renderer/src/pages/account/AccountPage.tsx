import {Navigate, useNavigate} from "react-router-dom";
import {MdOutlineLogout} from "react-icons/md";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";

const AccountPage = () => {
    const isLoggedIn = useSelector((state: RootState) => state.auth).status === "account";
    const navigate = useNavigate();

    console.log("asdfkadfsk")

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
