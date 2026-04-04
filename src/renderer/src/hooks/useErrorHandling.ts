import {useEffect, useState} from "react";
import {InvalidInputKeys, MayError} from "../../../shared/Api";
import toast from "react-hot-toast";
import InvalidInputError from "@renderer/components/InputError";

const useErrorHandling = () => {
    const [error, setError] = useState<MayError>(null);

    useEffect(() => {
        if(!error) return;
        if(error?.error === "info") toast.error(error.arg.message)
        else if(error.error === "no-connection") toast.error("Cannot reach Dodio server!");
        else if(error.error === "unknown-error") toast.error("An unknown server error occurred!");
    }, [error]);

    const hasError = (key: InvalidInputKeys) =>
        error?.error === "invalid-input" && error.arg.inputKey === key;

    return {setError, hasError, InvalidInputError:(p: {inputKey: InvalidInputKeys}) => InvalidInputError({error, inputKey: p.inputKey})};
};

export default useErrorHandling;
