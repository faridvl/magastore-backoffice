import { tailwind } from '@/utils/tailwind-utils';
import React, { HTMLAttributeAnchorTarget, ElementType } from 'react';

export enum TypographyVariant {
    HEADER = 'HEADER',
    SUBTITLE = 'SUBTITLE',
    HELPER = 'HELPER',
    ACCENT = 'ACCENT',
    BODY = 'BODY',
    BODY_BOLD = 'BODY_BOLD',
    BODY_SEMIBOLD = 'BODY_SEMIBOLD',
    LINK_TEXT = 'LINK_TEXT',
    CAPTION = 'CAPTION',
    OVERLINE = 'OVERLINE',
    QUOTE = 'QUOTE',
    BUTTON_TEXT = 'BUTTON_TEXT',
}

type TextProps = {
    variant?: TypographyVariant;
    ignoreImplicitSpacing?: boolean;
    inline?: boolean;
    disabled?: boolean;
    href?: string;
    target?: HTMLAttributeAnchorTarget;
    textColor?: string;
    className?: string;
    as?: ElementType;
};

type HtmlSvgElement = React.HTMLAttributes<HTMLElement | SVGElement>;
type Props = TextProps & HtmlSvgElement;

type VariantStyle = {
    colorClassName?: string;
    className?: string;
    spacingClassName?: string;
    component: ElementType;
};

const brandPrimary = 'text-primary';
const brandAccent = 'text-accent';
const neutralDark = 'text-neutral-900 dark:text-neutral-50';
const neutralBase = 'text-neutral-700 dark:text-neutral-300';
const neutralLight = 'text-neutral-500 dark:text-neutral-400';

const commonStylesClassName = 'tracking-tight';

const variantStyles: { [key in TypographyVariant]: VariantStyle } = {
    [TypographyVariant.HEADER]: {
        component: 'h1',
        className: `${commonStylesClassName} font-display font-extrabold text-3xl md:text-4xl leading-tight`,
        colorClassName: neutralDark,
    },
    [TypographyVariant.SUBTITLE]: {
        component: 'h2',
        className: `${commonStylesClassName} font-display font-semibold text-xl md:text-2xl leading-snug`,
        colorClassName: neutralBase,
    },
    [TypographyVariant.ACCENT]: {
        component: 'h3',
        className: `${commonStylesClassName} font-sans font-bold text-lg md:text-xl uppercase tracking-wider`,
        colorClassName: brandAccent,
    },
    [TypographyVariant.BODY]: {
        component: 'p',
        className: `font-sans font-normal text-[16px] leading-relaxed`,
        colorClassName: neutralBase,
    },
    [TypographyVariant.BODY_BOLD]: {
        component: 'p',
        className: `font-sans font-bold text-[16px]`,
        colorClassName: neutralBase,
    },
    [TypographyVariant.BODY_SEMIBOLD]: {
        component: 'p',
        className: `font-sans font-semibold text-[16px]`,
        colorClassName: neutralBase,
    },
    [TypographyVariant.HELPER]: {
        component: 'p',
        className: `font-sans font-normal text-[13px]`,
        colorClassName: neutralLight,
    },
    [TypographyVariant.LINK_TEXT]: {
        component: 'a',
        className: `font-sans font-medium text-[15px] cursor-pointer underline-offset-4 hover:underline transition-all duration-200`,
        colorClassName: brandPrimary,
    },
    [TypographyVariant.CAPTION]: {
        component: 'span',
        className: `font-sans font-normal text-[12px]`,
        colorClassName: neutralLight,
    },
    [TypographyVariant.OVERLINE]: {
        component: 'span',
        className: `font-sans font-bold text-[11px] uppercase tracking-[0.2em]`,
        colorClassName: neutralLight,
    },
    [TypographyVariant.QUOTE]: {
        component: 'blockquote',
        className: `font-sans font-light italic text-lg border-l-4 border-accent pl-4`,
        colorClassName: neutralDark,
    },
    [TypographyVariant.BUTTON_TEXT]: {
        component: 'span',
        className: `font-sans font-semibold text-[14px]`,
        colorClassName: 'text-inherit',
    },
};

function TextComponent({
    variant = TypographyVariant.BODY,
    ignoreImplicitSpacing = false,
    inline = false,
    disabled = false,
    className,
    href,
    target,
    textColor,
    as,
    ...other
}: Props) {
    const {
        className: variantClassName,
        colorClassName,
        spacingClassName,
        component: DefaultComponent,
    } = variantStyles[variant];

    const Component: ElementType = as || (inline ? 'span' : (href ? 'a' : DefaultComponent));

    return (
        <Component
            {...other}
            href={href}
            target={target}
            className={tailwind(
                variantClassName,
                textColor || colorClassName,
                !ignoreImplicitSpacing && spacingClassName,
                { 'opacity-40 cursor-not-allowed': disabled },
                className,
            )}
        />
    );
}

export const Typography = React.memo(TextComponent);