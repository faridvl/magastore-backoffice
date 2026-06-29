import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CalendarDays, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, DateRange } from 'react-day-picker';
import { es } from 'react-day-picker/locale';

interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onClear: () => void;
}

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtShort = (d: Date) =>
  d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short' });

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  from, to, onFromChange, onToChange, onClear,
}) => {
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fromDate = from ? new Date(from + 'T00:00:00') : undefined;
  const toDate   = to   ? new Date(to   + 'T00:00:00') : undefined;
  const hasValue = !!from || !!to;

  // Posiciona el popover con fixed para que nunca quede detrás de otros elementos
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const popoverWidth = window.innerWidth < 640 ? Math.min(340, window.innerWidth - 16) : 660;
    let left = rect.right - popoverWidth;
    if (left < 8) left = 8;
    setPopoverStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left,
      width: popoverWidth,
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    const onScroll = () => { if (open) updatePosition(); };
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  const handleSelect = (range: DateRange | undefined) => {
    onFromChange(range?.from ? toISO(range.from) : '');
    onToChange(range?.to ? toISO(range.to) : '');
    if (range?.from && range?.to) setOpen(false);
  };

  const label = hasValue
    ? [fromDate && fmtShort(fromDate), toDate && fmtShort(toDate)].filter(Boolean).join(' → ')
    : 'Período';

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          ref={buttonRef}
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
            hasValue
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-200 hover:text-slate-700'
          }`}
        >
          <CalendarDays size={14} className={hasValue ? 'text-amber-400' : 'text-slate-400'} />
          <span>{label}</span>
        </button>
        {hasValue && (
          <button
            onClick={() => { onClear(); setOpen(false); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {open && (
        <div
          ref={popoverRef}
          style={popoverStyle}
          className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 animate-in fade-in zoom-in-95 duration-150"
        >
          <DayPicker
            mode="range"
            locale={es}
            selected={{ from: fromDate, to: toDate }}
            onSelect={handleSelect}
            numberOfMonths={isMobile ? 1 : 2}
            components={{
              PreviousMonthButton: (props) => (
                <button {...props} className="p-1.5 rounded-lg hover:bg-slate-100 transition-all text-slate-500 absolute left-0 top-0">
                  <ChevronLeft size={15} />
                </button>
              ),
              NextMonthButton: (props) => (
                <button {...props} className="p-1.5 rounded-lg hover:bg-slate-100 transition-all text-slate-500 absolute right-0 top-0">
                  <ChevronRight size={15} />
                </button>
              ),
            }}
            classNames={{
              root: 'text-sm select-none',
              months: 'flex gap-6',
              month: 'flex-1',
              month_caption: 'relative flex justify-center items-center h-8 mb-3',
              caption_label: 'text-sm font-black text-slate-800 capitalize',
              nav: 'hidden',
              month_grid: 'w-full border-collapse',
              weekdays: 'flex mb-1',
              weekday: 'flex-1 text-center text-[10px] font-black text-slate-400 uppercase py-1',
              weeks: 'flex flex-col gap-0.5',
              week: 'flex',
              day: 'flex-1 flex items-center justify-center p-px',
              day_button: 'w-8 h-8 rounded-xl text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-all focus:outline-none w-full',
              selected: '',
              range_start: '[&>button]:!bg-slate-900 [&>button]:!text-white [&>button]:rounded-xl',
              range_end: '[&>button]:!bg-slate-900 [&>button]:!text-white [&>button]:rounded-xl',
              range_middle: '[&>button]:!bg-amber-50 [&>button]:!text-amber-700 [&>button]:rounded-none',
              today: '[&>button]:font-black [&>button]:text-amber-600',
              outside: '[&>button]:!text-slate-300 [&>button]:hover:!bg-transparent [&>button]:cursor-default',
              disabled: '[&>button]:opacity-30 [&>button]:cursor-not-allowed',
            }}
          />
          {hasValue && (
            <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                {[fromDate && fmtShort(fromDate), toDate && fmtShort(toDate)].filter(Boolean).join(' → ')}
              </span>
              <button
                onClick={() => { onClear(); setOpen(false); }}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-all"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
