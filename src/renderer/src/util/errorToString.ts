import {DodioError} from "../../../shared/Api";

export function errorToString(
    error: DodioError,
) {

    switch (error.error) {
        case "invalid-input":
            return error.arg.message;
        case "no-connection":
            return "Cannot reach Dodio server!";
        case "no-login":
            return "You are not logged in.";
        case "info":
            return error.arg.message;
        case "Not Found":
            return "Endpoint not found. (404)";
        default: {
            return error.error;
        }
    }
}
