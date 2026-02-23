import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

type ClassValue = string | number | null | boolean | undefined | { [id: string]: any } | ClassValue[];

export function tailwind(...classes: ClassValue[]): string {
    return twMerge(clsx(classes));
}
