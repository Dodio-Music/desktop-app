import {useEffect, useState} from "react";

export default <T>(producer: () => Promise<T>, fallback: T): T => {
    const [value, setValue] = useState(fallback);

    useEffect(() => {
        producer().then(v => setValue(v));
    }, [producer]);

    return value;
}
