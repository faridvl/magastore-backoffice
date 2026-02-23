import React, { ReactNode } from 'react';
import {
    Menu,
    MenuButton,
    MenuItem,
    MenuItems,
    Transition,
    Portal,
} from '@headlessui/react';
import { MoreVertical } from 'lucide-react';
import { Typography, TypographyVariant } from '../typography/typography';
import { tailwind } from '@/utils/tailwind-utils';

export type ActionVariant = 'default' | 'danger';

export type Action = {
    name: string;
    icon?: ReactNode;
    onClick: (row: any) => void | Promise<any>;
    variant?: ActionVariant;
};

interface ToggleMenuProps {
    actions: Action[];
    rowData: any;
}

export function ToggleMenu({ actions, rowData }: ToggleMenuProps) {
    return (
        <div className="relative inline-block text-left">
            <Menu>
                {({ open }) => (
                    <>
                        {/* BUTTON */}
                        <MenuButton
                            className={tailwind(
                                'p-2 rounded-xl transition-all outline-none',
                                open
                                    ? 'bg-slate-100 text-[#1E3A8A]'
                                    : 'text-slate-400 hover:text-[#1E3A8A] hover:bg-slate-100'
                            )}
                        >
                            <MoreVertical size={18} strokeWidth={2.5} />
                        </MenuButton>

                        {/* DROPDOWN */}
                        <Portal>
                            <Transition
                                as={React.Fragment}
                                enter="transition ease-out duration-100"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                            >
                                <MenuItems
                                    anchor="bottom end"
                                    className="w-52 rounded-2xl bg-white shadow-xl border border-slate-100 z-[9999] overflow-hidden p-1.5"
                                >
                                    {actions?.map((action, index) => {
                                        const isDanger = action.variant === 'danger';

                                        return (
                                            <MenuItem key={`${action.name}-${index}`}>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => action.onClick(rowData)}
                                                        className={tailwind(
                                                            'flex w-full items-center gap-3 px-3 py-2 rounded-xl transition-colors',
                                                            active &&
                                                            (isDanger
                                                                ? 'bg-red-50'
                                                                : 'bg-slate-100')
                                                        )}
                                                    >
                                                        {action.icon}

                                                        <Typography
                                                            variant={TypographyVariant.BODY_SEMIBOLD}
                                                            textColor={
                                                                isDanger
                                                                    ? active
                                                                        ? 'text-red-600'
                                                                        : 'text-red-500'
                                                                    : active
                                                                        ? 'text-[#1E3A8A]'
                                                                        : undefined
                                                            }
                                                        >
                                                            {action.name}
                                                        </Typography>
                                                    </button>
                                                )}
                                            </MenuItem>
                                        );
                                    })}
                                </MenuItems>
                            </Transition>
                        </Portal>
                    </>
                )}
            </Menu>
        </div>
    );
}
