import {InvalidInputKeys, MayError} from "../../../shared/Api";

interface Props {
    error: MayError;
    inputKey: InvalidInputKeys;
}

const InputError = ({error, inputKey}: Props) => {
    if(error?.error !== "invalid-input" || error.arg.inputKey !== inputKey) return <></>;

    return (
        <span>{error.arg.message}</span>
    );
};

export default InputError;
