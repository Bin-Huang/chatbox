import { useCallback, useLayoutEffect, useRef } from 'react';

// see https://github.com/reactjs/rfcs/pull/220
export default function useEvent<F extends (...args: any[]) => any>(handler: F) {
    const handlerRef = useRef(null);
    // In a real implementation, this would run before layout effects
    useLayoutEffect(() => {
        handlerRef.current = handler as any;
    });
    return useCallback((...args: Parameters<F>): ReturnType<F> => {
        // In a real implementation, this would throw if called during render
        const fn = handlerRef.current as any;
        return fn(...args);
    }, []);
}
