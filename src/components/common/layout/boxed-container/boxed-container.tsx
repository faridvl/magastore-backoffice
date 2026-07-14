import { ReactNode } from "react";
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
} & JSX.IntrinsicElements['div'];

export function BoxedLayout({
    contentStyle = BoxedLayoutStyle.BOXED,
    children,
    containerClassName,
    boxClassName,
    ...divProps
}: BoxedLayoutProps) {
    const isBoxed = contentStyle === BoxedLayoutStyle.BOXED;

    return (
        <div
            className={tailwind('flex flex-row h-full w-full justify-center', containerClassName)}
            {...divProps}
        >
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
