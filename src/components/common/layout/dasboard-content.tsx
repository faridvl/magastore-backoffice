import { ReactNode, Ref } from "react";
import { tailwind } from "@/utils/tailwind-utils";
import { BoxedLayout, BoxedLayoutStyle } from "./boxed-container/boxed-container";

type Props = {
    children?: JSX.Element;
    onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
    contentStyle?: BoxedLayoutStyle;
    contentClassNames?: string;
    //  bottomPadding?: string;
    boxClassName?: string;
    containerRef?: Ref<HTMLDivElement>;
    overlay?: ReactNode;
}

export function DashboardLayoutContent({
    contentStyle,
    children,
    onScroll,
    contentClassNames,
    //  bottomPadding, // TBD(!): DEFINIR COMO VOY A AGREGAR EL PADDING AL FINAL
    boxClassName,
    containerRef,
    overlay,
}: Props) {
    return (
        <BoxedLayout
            contentStyle={contentStyle}
            onScroll={onScroll}
            containerClassName={tailwind(contentClassNames, 'overflow-auto')}
            boxClassName={boxClassName}
            containerRef={containerRef}
            overlay={overlay}
        >
            {children}
        </BoxedLayout>
    );
}