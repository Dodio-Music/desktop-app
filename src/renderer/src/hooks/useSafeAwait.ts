import {useEffect, useState} from "react";

/**
 * Await a promise where it is safe to expect no error to occur
 */
const useSafeAwait =  <T>(producer: () => Promise<T>, fallback: T): T => {
    const [value, setValue] = useState(fallback);

    useEffect(() => {
        producer().then(v => setValue(v))
            .catch(err => console.error("unexpected error: ", err));
    }, [producer]);

    return value;
}

export default useSafeAwait;
