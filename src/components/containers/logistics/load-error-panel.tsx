import React from 'react';
import { Button, ButtonVariant } from '@/components/common/button/button';

interface LoadErrorPanelProps {
    onRetry: () => void;
}

export const LoadErrorPanel: React.FC<LoadErrorPanelProps> = ({ onRetry }) => (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-3xl border border-slate-100 bg-white px-6 py-14 text-center shadow-sm">
        <p className="text-base font-bold text-slate-600">No se pudo cargar. Revisa tu conexión.</p>
        <Button variant={ButtonVariant.GHOST} onClick={onRetry}>
            Reintentar
        </Button>
    </div>
);
