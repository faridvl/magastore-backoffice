import { Loader2, ArrowDown } from 'lucide-react';
import { tailwind } from '@/utils/tailwind-utils';

type Props = {
    pullDistance: number;
    isRefreshing: boolean;
    isTriggered: boolean;
};

export function PullToRefreshIndicator({ pullDistance, isRefreshing, isTriggered }: Props) {
    if (pullDistance <= 0) return null;

    return (
        <div
            className="absolute top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
            style={{
                transform: `translateY(${pullDistance - 40}px)`,
                transition: isRefreshing ? 'transform 200ms ease-out' : undefined,
            }}
        >
            <div
                className={tailwind(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    'bg-white dark:bg-slate-800 shadow-lg',
                    'border border-slate-200 dark:border-slate-700',
                )}
                style={{ opacity: Math.min(pullDistance / 60, 1) }}
            >
                {isRefreshing ? (
                    <Loader2 size={18} className="animate-spin text-amber-500" />
                ) : (
                    <ArrowDown
                        size={18}
                        className={tailwind(
                            'transition-transform duration-200',
                            isTriggered ? 'rotate-180 text-amber-500' : 'text-slate-400',
                        )}
                    />
                )}
            </div>
        </div>
    );
}
