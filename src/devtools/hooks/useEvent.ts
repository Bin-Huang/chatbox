import { useCallback, useLayoutEffect, useRef } from 'react';

// see https://github.com/reactjs/rfcs/pull/220
export default function useEvent<F extends (...args: unknown[]) => unknown>(handler: F) {
    const handlerRef = useRef(null);
    // In a real implementation, this would run before layout effects
    useLayoutEffect(() => {
        handlerRef.current = handler;
    });
    return useCallback((...args: Parameters<F>): ReturnType<F> => {
        // In a real implementation, this would throw if called during render
        const fn = handlerRef.current;
        return fn(...args);
    }, []);
}
