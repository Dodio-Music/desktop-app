import {MdOutlineLogout} from "react-icons/md";
import {useNavigate} from "react-router-dom";

const AccountPage = () => {
    const navigate = useNavigate();

    return (
        <div className={"pageWrapper"}>
            <h1>Account page</h1>
            <p>heres account data</p>
            <button onClick={()=> window.api.logout().then(() => navigate("/"))}><MdOutlineLogout/> Logout</button>
        </div>
    );
};

export default AccountPage;
