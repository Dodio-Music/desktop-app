import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

export function useRequiredParam(paramName: string) {
    const params = useParams();
    const navigate = useNavigate();
    const mounted = useRef(false);

    const value = params[paramName];

    useEffect(() => {
        if (value || mounted.current) return;

        toast.error(`No ${paramName} provided`);
        navigate("/", { replace: true });
        mounted.current = true;
    }, [value, navigate, paramName]);

    return value;
}
