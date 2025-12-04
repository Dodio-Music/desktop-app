import { useEffect, useRef } from "react";

export function useTraceUpdate<T extends Record<string, unknown>>(props: T): void {
    const prev = useRef<T>(props);

    useEffect(() => {
        const changedProps = Object.entries(props).reduce<
            Partial<Record<keyof T, [unknown, unknown]>>
        >((acc, [key, value]) => {
            const typedKey = key as keyof T;

            if (prev.current[typedKey] !== value) {
                acc[typedKey] = [prev.current[typedKey], value];
            }

            return acc;
        }, {});

        if (Object.keys(changedProps).length > 0) {
            console.log("Changed props:", changedProps);
        }

        prev.current = props;
    });
}
