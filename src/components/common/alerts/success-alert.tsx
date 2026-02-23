// src/components/ui/alerts/success-alert.tsx
import React from 'react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export const SuccessAlert = ({
    onClose,
    title = "¡Operación Exitosa!",
    message = "Los datos se han guardado correctamente."
}: {
    onClose: () => void;
    title?: string;
    message?: string;
}) => {
    return (
        <div className="fixed top-6 right-6 z-[100] animate-slide-in">
            <div className="bg-white/80 backdrop-blur-xl border border-emerald-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-3xl p-5 flex items-center gap-5 max-w-[400px]">
                <div className="bg-emerald-500 p-2.5 rounded-2xl shadow-lg shadow-emerald-200">
                    <CheckCircleIcon className="h-7 w-7 text-white" />
                </div>

                <div className="flex-1">
                    <h3 className="text-slate-900 font-black text-sm uppercase tracking-wider">{title}</h3>
                    <p className="text-slate-500 text-sm font-medium">{message}</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                >
                    <XMarkIcon className="h-5 w-5 stroke-[2.5px]" />
                </button>
            </div>
        </div>
    );
};