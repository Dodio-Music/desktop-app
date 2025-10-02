import {useEffect, useState} from "react";
import {IAuth} from "../../../shared/Typing";


export function useLogin(): string|undefined {
    const [auth, setAuth] = useState<IAuth>({});

    useEffect(() => {
        const fetchAuth = async () => {
            const authData = await window.api.getAuth();
            setAuth(authData);
        };
        void fetchAuth();

        // auth -> 
    }, []);

    return auth.key;
}
