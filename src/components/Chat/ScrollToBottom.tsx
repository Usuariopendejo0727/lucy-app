'use client';

import { useState, useEffect } from 'react';

interface ScrollToBottomProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
}

// Bug #8 fix: Removed unused observerRef and sentinelRef
export default function ScrollToBottom({ containerRef }: ScrollToBottomProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            setIsVisible(!isNearBottom);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [containerRef]);

    const scrollToBottom = () => {
        containerRef.current?.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: 'smooth',
        });
    };

    if (!isVisible) return null;

    return (
        <button
            className="scroll-to-bottom-btn"
            onClick={scrollToBottom}
            aria-label="Ir al final"
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
            </svg>
        </button>
    );
}
