import React from 'react';
import { tailwind } from '@/utils/tailwind-utils';

export enum ButtonVariant {
    PRIMARY = 'PRIMARY',   // Azul - General / Admin
    ACCENT = 'ACCENT',     // Dorado - Compra / Destacados
    DANGER = 'DANGER',     // Rojo - Errores / Eliminar
    ALERT = 'ALERT',       // Naranja - Avisos
    CANCEL = 'CANCEL',     // Gris - Volver / Cancelar
    GHOST = 'GHOST'        // Bordeado - Acciones secundarias
}

type VariantStyle = {
    className: string;
};

type ButtonProps = {
    variant: ButtonVariant;
    text?: string;
    onClick?: () => void;
    children?: React.ReactNode;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
};

export function Button({
    variant,
    text,
    onClick,
    children,
    className: customClassName,
    type = 'button',
    disabled,
    ...props
}: ButtonProps) {

    const baseStyle =
        'flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

    const variantStyles: { [key in ButtonVariant]: VariantStyle } = {
        [ButtonVariant.PRIMARY]: {
            className: `${baseStyle} bg-primary text-white hover:bg-primary-dark focus:ring-primary/40 shadow-primary-button`,
        },
        [ButtonVariant.ACCENT]: {
            className: `${baseStyle} bg-accent text-white hover:bg-accent-dark focus:ring-accent/40 shadow-glow`,
        },
        [ButtonVariant.DANGER]: {
            className: `${baseStyle} bg-danger text-white hover:bg-danger-dark focus:ring-danger/40`,
        },
        [ButtonVariant.ALERT]: {
            className: `${baseStyle} bg-warning text-white hover:bg-warning-dark focus:ring-warning/40`,
        },
        [ButtonVariant.CANCEL]: {
            className: `${baseStyle} bg-neutral-100 text-neutral-700 hover:bg-neutral-200 focus:ring-neutral-300 dark:bg-neutral-800 dark:text-neutral-200`,
        },
        [ButtonVariant.GHOST]: {
            className: `${baseStyle} border-2 border-primary text-primary hover:bg-primary/5 focus:ring-primary/20`,
        },
    };

    const { className: variantClassName } = variantStyles[variant];

    return (
        <button
            type={type}
            disabled={disabled}
            className={tailwind(variantClassName, customClassName)}
            onClick={onClick}
            {...props}
        >
            {children || text}
        </button>
    );
}