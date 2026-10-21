import React from 'react';
import { MessageCircle } from 'lucide-react';

export const WinBackButton: React.FC<{ onClick: () => void; isLoading: boolean }> = ({ onClick, isLoading }) => (
  <button
    type="button"
    // Vive dentro de filas y tarjetas clicables que abren el detalle.
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    disabled={isLoading}
    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[36px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-[11px] hover:bg-emerald-100 transition-all whitespace-nowrap disabled:opacity-40"
  >
    <MessageCircle size={13} />
    Invitar a volver
  </button>
);
