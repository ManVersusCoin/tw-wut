import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
    children: ReactNode;
    content: ReactNode;
    side?: TooltipSide;
    className?: string;
    contentClassName?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
    children,
    content,
    side = 'top',
    className = '',
    contentClassName = ''
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isVisible && triggerRef.current && tooltipRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();

            let top = 0;
            let left = 0;
            const gap = 8;

            // --- 1. Calculate Primary Position ---
            switch (side) {
                case 'top':
                    top = triggerRect.top - tooltipRect.height - gap;
                    left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
                    break;
                case 'bottom':
                    top = triggerRect.bottom + gap;
                    left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
                    break;
                case 'left':
                    top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
                    left = triggerRect.left - tooltipRect.width - gap;
                    break;
                case 'right':
                    top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
                    left = triggerRect.right + gap;
                    break;
            }

            // --- 2. Auto-Flip Logic (Fix for Sticky Headers) ---
            // If top side is clipped by the window top edge, flip to bottom
            if (side === 'top' && top < 0) {
                top = triggerRect.bottom + gap;
            }
            // If bottom side is clipped by window bottom, flip to top
            if (side === 'bottom' && top + tooltipRect.height > window.innerHeight) {
                top = triggerRect.top - tooltipRect.height - gap;
            }

            // --- 3. Horizontal Safety (Prevent clipping left/right) ---
            if (left < 10) left = 10;
            if (left + tooltipRect.width > window.innerWidth - 10) {
                left = window.innerWidth - tooltipRect.width - 10;
            }

            setCoords({
                top: top + window.scrollY,
                left: left + window.scrollX
            });
        }
    }, [isVisible, side]);

    if (!content) return <>{children}</>;

    return (
        <>
            <div
                ref={triggerRef}
                className={`inline-block ${className}`}
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
            >
                {children}
            </div>

            {isVisible && createPortal(
                <div
                    ref={tooltipRef}
                    style={{
                        top: coords.top,
                        left: coords.left,
                        position: 'absolute',
                    }}
                    className={`
                        z-[9999] 
                        pointer-events-none 
                        px-3 py-2
                        text-xs font-medium 
                        text-white 
                        bg-gray-900/95 dark:bg-gray-800/95 
                        backdrop-blur-sm
                        border border-gray-700/50
                        rounded-lg 
                        shadow-xl 
                        w-max max-w-xs 
                        whitespace-normal
                        animate-in fade-in zoom-in-95 duration-200
                        ${contentClassName}
                    `}
                >
                    {content}
                </div>,
                document.body
            )}
        </>
    );
};