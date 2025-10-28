import {useEffect, useState} from "react";
import {InvalidInputKeys, MayError} from "../../../shared/Api";
import toast from "react-hot-toast";
import InvalidInputError from "@renderer/components/InputError";

const useErrorHandling = () => {
    const [error, setError] = useState<MayError>(null);

    useEffect(() => {
        if(!error) return;
        if(error?.error === "info") toast.error(error.arg.message)
        else if(error.error === "no-connection") toast.error("No internet connection!")
    }, [error]);

    return {setError, InvalidInputError:(p: {inputKey: InvalidInputKeys}) => InvalidInputError({error, inputKey: p.inputKey})};
};

export default useErrorHandling;
