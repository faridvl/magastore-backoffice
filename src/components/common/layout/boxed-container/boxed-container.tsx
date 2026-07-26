import { ReactNode, Ref } from "react";
import { tailwind } from "@/utils/tailwind-utils";

export enum BoxedLayoutStyle {
    FULL = 'FULL',
    BOXED = 'BOXED',
}

type BoxedLayoutProps = {
    children: ReactNode;
    contentStyle?: BoxedLayoutStyle;
    boxClassName?: string;
    containerClassName?: string;
    containerRef?: Ref<HTMLDivElement>;
    overlay?: ReactNode;
} & JSX.IntrinsicElements['div'];

export function BoxedLayout({
    contentStyle = BoxedLayoutStyle.BOXED,
    children,
    containerClassName,
    boxClassName,
    containerRef,
    overlay,
    ...divProps
}: BoxedLayoutProps) {
    const isBoxed = contentStyle === BoxedLayoutStyle.BOXED;

    return (
        <div
            ref={containerRef}
            className={tailwind(
                'relative flex flex-row h-full w-full justify-center',
                'overscroll-y-contain',
                containerClassName,
            )}
            {...divProps}
        >
            {overlay}
            <div
                className={tailwind(
                    'w-full pt-6 pb-24 px-4 md:px-8',
                    'pb-[calc(6rem+env(safe-area-inset-bottom))]',
                    isBoxed && 'max-w-7xl md:px-0',
                    boxClassName,
                )}
            >
                {children}
            </div>
        </div>
    );
}
