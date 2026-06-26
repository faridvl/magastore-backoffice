import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  tooltip?: string;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, tooltip, className = '' }) => {
  const [show, setShow] = useState(false);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{title}</h2>
      {tooltip && (
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            className="text-slate-400 hover:text-amber-500 transition-colors"
          >
            <Info size={14} />
          </button>
          {show && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-56 bg-slate-800 text-white text-[11px] font-medium rounded-xl px-3 py-2 shadow-xl leading-snug">
              {tooltip}
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-slate-800 rotate-45 -mt-1" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
