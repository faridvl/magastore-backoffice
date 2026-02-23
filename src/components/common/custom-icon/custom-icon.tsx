import React from 'react';
import * as HeroIcons from "@heroicons/react/24/outline";
import { tailwind } from '@/utils/tailwind-utils';

export enum IconName {
    ACADEMIC_CAP = 'AcademicCap',
    CHEVRON_LEFT_ICON = 'ChevronLeftIcon',
    CHEVRON_RIGHT_ICON = 'ChevronRightIcon',
    ELLIPSIS_VERTICAL_ICON = 'EllipsisVerticalIcon'
    //TODO(!): Agregar hero icons conforme se vayan usando
}

type IconComponents = {
    [key in IconName]: React.ElementType;
};

const HeroIconComponents: IconComponents = {
    AcademicCap: HeroIcons.AcademicCapIcon,
    ChevronLeftIcon: HeroIcons.ChevronLeftIcon,
    ChevronRightIcon: HeroIcons.ChevronRightIcon,
    EllipsisVerticalIcon: HeroIcons.EllipsisVerticalIcon,
    //TODO(!): Agregar hero icons conforme se vayan usando
};


export enum IconSize {
    XS = 'h-4 w-4',     // 16px
    SM = 'h-5 w-5',     // 20px
    MD = 'h-6 w-6',     // 24px
    LG = 'h-8 w-8',     // 32px
    XL = 'h-10 w-10',   // 40px
}

type IconProps = {
    icon: IconName;
    size?: IconSize;
    onClick?: () => void;
    className?: string;
};

export function CustomIcon({
    icon,
    size = IconSize.LG,
    onClick,
    className,
}: IconProps): JSX.Element {
    const HeroIcon = HeroIconComponents[icon];

    return (
        <HeroIcon
            //TODO(): agregar colores de texto al tailwind config
            className={tailwind(`${size} text-gray-900 cursor-pointer`, onClick ? 'cursor-pointer' : '', className)}
            onClick={onClick}
        />
    );
}
