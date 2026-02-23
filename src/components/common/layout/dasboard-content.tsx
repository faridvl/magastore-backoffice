import { tailwind } from "@/utils/tailwind-utils";
import { BoxedLayout, BoxedLayoutStyle } from "./boxed-container/boxed-container";

type Props = {
    children?: JSX.Element;
    onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
    contentStyle?: BoxedLayoutStyle;
    contentClassNames?: string;
    //  bottomPadding?: string;
    boxClassName?: string;
}

export function DashboardLayoutContent({
    contentStyle,
    children,
    onScroll,
    contentClassNames,
    //  bottomPadding, // TBD(!): DEFINIR COMO VOY A AGREGAR EL PADDING AL FINAL
    boxClassName,
}: Props) {
    return (
        <BoxedLayout
            contentStyle={contentStyle}
            onScroll={onScroll}
            containerClassName={tailwind(contentClassNames, 'overflow-auto')}
            boxClassName={boxClassName}
        >
            {children}
        </BoxedLayout>
    );
}