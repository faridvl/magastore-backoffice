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
                    'w-full pt-8 pb-6 px-8 mb-10',
                    isBoxed && ' xs:max-w-644 md:px-0',
                    boxClassName,
                )}
            >
                {children}
            </div>
        </div>
    );
}
