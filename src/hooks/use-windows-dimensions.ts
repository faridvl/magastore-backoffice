import { useState, useEffect } from 'react';
import { screenBreakpoints } from '@/shared/constants/screen-break-points';

function getWindowDimensions() {
    if (typeof window !== 'undefined') {
        const { innerWidth: width, innerHeight: height } = window;

        return {
            width,
            height,
        };
    }

    return { width: 0, height: 0 };
}

type WindowDimensionsHook = {
    width: number;
    height: number;
    isMobile: boolean;
    isDesktop: boolean;
};

export default function useWindowDimensions(): WindowDimensionsHook {
    const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        function handleResize() {
            const windowDimensionValues = getWindowDimensions();
            setWindowDimensions(windowDimensionValues);

            if (windowDimensionValues.width <= screenBreakpoints.md) {
                setIsMobile(true);
            } else {
                setIsMobile(false);
            }
        }

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return {
        width: windowDimensions.width,
        height: windowDimensions.height,
        isMobile,
        isDesktop: !isMobile,
    };
}
