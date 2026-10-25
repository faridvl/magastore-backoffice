import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, DateRange } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import { monthLabelEs, BUSINESS_TIMEZONE } from '@/shared/utils/timezone';

interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onClear: () => void;
  /** Calendario dentro de su contenedor (p. ej. el panel de filtros), sin botón ni ventana flotante. */
  inline?: boolean;
}

// useLayoutEffect avisa al renderizar en el servidor (Pages Router).
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const TWO_MONTHS_MIN_WIDTH = 1200;
const SINGLE_MONTH_WIDTH = 340;
const TWO_MONTHS_WIDTH = 660;
const VIEWPORT_MARGIN = 8;
const POPOVER_GAP = 8;
const POPOVER_Z_INDEX = 70;
// Alto del header: el popover abierto hacia arriba no debe taparlo.
const HEADER_HEIGHT = 64;

const HIDDEN_POPOVER_STYLE: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  visibility: 'hidden',
  zIndex: POPOVER_Z_INDEX,
};

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getPopoverWidth = (monthCount: number) =>
  Math.min(monthCount === 2 ? TWO_MONTHS_WIDTH : SINGLE_MONTH_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);

/** Hoy en hora de Costa Rica, como fecha local sin hora. */
const getBusinessToday = (): Date => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const valueOf = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(valueOf('year'), valueOf('month') - 1, valueOf('day'));
};

// Mismo nombre que la etiqueta corta ("set"): el negocio escribe "setiembre".
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre',
];

const getMonthCount = () => (window.innerWidth >= TWO_MONTHS_MIN_WIDTH ? 2 : 1);

interface DateParts {
  year: number;
  month: number;
  day: number;
}

const parseISO = (value: string): DateParts => {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
};

const monthName = (month: number) => monthLabelEs(`2000-${String(month).padStart(2, '0')}`).toLowerCase();

/** "5–9 oct 2026", "5 oct – 2 nov 2026" o "5 oct 2025 – 2 nov 2026"; un solo día: "5 oct 2026". */
export const formatPeriodLabel = (from: string, to: string): string => {
  if (!from && !to) return 'Período';
  if (!from || !to) {
    const only = parseISO(from || to);
    return `${from ? 'Desde' : 'Hasta'} ${only.day} ${monthName(only.month)} ${only.year}`;
  }
  const start = parseISO(from);
  const end = parseISO(to);
  const startText = `${start.day} ${monthName(start.month)}`;
  const endText = `${end.day} ${monthName(end.month)} ${end.year}`;
  if (from === to) return endText;
  if (start.year !== end.year) return `${startText} ${start.year} – ${endText}`;
  if (start.month === end.month) return `${start.day}–${endText}`;
  return `${startText} – ${endText}`;
};

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  from, to, onFromChange, onToChange, onClear, inline = false,
}) => {
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>(HIDDEN_POPOVER_STYLE);
  const [monthCount, setMonthCount] = useState(1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fromDate = from ? new Date(from + 'T00:00:00') : undefined;
  const toDate   = to   ? new Date(to   + 'T00:00:00') : undefined;
  const hasValue = !!from || !!to;
  const label = formatPeriodLabel(from, to);
  const today = getBusinessToday();
  const visibleMonths = inline ? 1 : monthCount;
  // Con dos meses se ve el anterior y el actual; con un rango elegido, abre en su inicio.
  const defaultMonth = fromDate
    ? new Date(fromDate.getFullYear(), fromDate.getMonth(), 1)
    : new Date(today.getFullYear(), today.getMonth() - (visibleMonths === 2 ? 1 : 0), 1);

  // Mide el popover ya renderizado (oculto) y lo coloca: abajo si cabe, si no arriba,
  // y si no cabe en ninguno ocupa la ventana con scroll propio.
  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    const popover = popoverRef.current;
    if (!button || !popover) return;

    const rect = button.getBoundingClientRect();
    const width = getPopoverWidth(monthCount);
    const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.right - width, window.innerWidth - width - VIEWPORT_MARGIN));
    const height = popover.scrollHeight;
    const spaceBelow = window.innerHeight - rect.bottom - POPOVER_GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - POPOVER_GAP - HEADER_HEIGHT;

    const base: React.CSSProperties = { position: 'fixed', left, width, zIndex: POPOVER_Z_INDEX };
    if (height <= spaceBelow) {
      setPopoverStyle({ ...base, top: rect.bottom + POPOVER_GAP });
    } else if (height <= spaceAbove) {
      setPopoverStyle({ ...base, top: rect.top - POPOVER_GAP - height });
    } else {
      setPopoverStyle({
        ...base,
        top: HEADER_HEIGHT,
        maxHeight: window.innerHeight - HEADER_HEIGHT - VIEWPORT_MARGIN,
        overflowY: 'auto',
      });
    }
  }, [monthCount]);

  useIsomorphicLayoutEffect(() => {
    if (!open || inline) return;
    const next = getMonthCount();
    if (next !== monthCount) {
      setMonthCount(next);
      return;
    }
    updatePosition();
  }, [open, inline, monthCount, from, to, updatePosition]);

  useEffect(() => {
    if (!open || inline) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onViewportChange = () => {
      const next = getMonthCount();
      if (next !== monthCount) setMonthCount(next);
      else updatePosition();
    };
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener('resize', onViewportChange);
    };
  }, [open, inline, monthCount, updatePosition]);

  const togglePopover = () => {
    if (!open) {
      setPopoverStyle(HIDDEN_POPOVER_STYLE);
      // Antes del primer render del calendario: react-day-picker no recalcula el mes inicial después.
      setMonthCount(getMonthCount());
    }
    setOpen((v) => !v);
  };

  // El primer toque de react-day-picker ya devuelve inicio = fin: solo se cierra con un rango de
  // dos días distintos; para un único día está "Listo".
  const handleSelect = (range: DateRange | undefined) => {
    // Tocar de nuevo el único día elegido lo deselecciona: se conserva en vez de borrar el filtro.
    if (!range && from && from === to) return;
    onFromChange(range?.from ? toISO(range.from) : '');
    onToChange(range?.to ? toISO(range.to) : '');
    if (!inline && range?.from && range?.to && toISO(range.from) !== toISO(range.to)) setOpen(false);
  };

  const calendar = (
    <DayPicker
      mode="range"
      locale={es}
      selected={{ from: fromDate, to: toDate }}
      onSelect={handleSelect}
      key={visibleMonths}
      numberOfMonths={visibleMonths}
      endMonth={new Date(today.getFullYear(), today.getMonth(), 1)}
      formatters={{ formatCaption: (month) => `${MONTH_NAMES[month.getMonth()]} ${month.getFullYear()}` }}
      defaultMonth={defaultMonth}
      disabled={{ after: today }}
      components={{
        PreviousMonthButton: (props) => (
          <button {...props} aria-label="Mes anterior" className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100 transition-all text-slate-500 aria-disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:hover:bg-transparent">
            <ChevronLeft size={15} />
          </button>
        ),
        NextMonthButton: (props) => (
          <button {...props} aria-label="Mes siguiente" className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100 transition-all text-slate-500 aria-disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:hover:bg-transparent">
            <ChevronRight size={15} />
          </button>
        ),
      }}
      classNames={{
        root: 'relative text-sm select-none',
        months: 'flex gap-6',
        month: 'flex-1',
        month_caption: 'relative flex justify-center items-center h-11 mb-2',
        caption_label: 'text-sm font-black text-slate-800 capitalize',
        nav: 'pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-between',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex mb-1',
        weekday: 'flex-1 text-center text-xs font-semibold text-slate-400 py-1',
        weeks: 'flex flex-col gap-0.5',
        week: 'flex',
        day: 'flex-1 flex items-center justify-center p-px',
        day_button: 'h-11 rounded-xl text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-all focus:outline-none w-full',
        selected: '',
        range_start: '[&>button]:!bg-slate-900 [&>button]:!text-white [&>button]:rounded-xl',
        range_end: '[&>button]:!bg-slate-900 [&>button]:!text-white [&>button]:rounded-xl',
        range_middle: '[&>button]:!bg-amber-50 [&>button]:!text-amber-700 [&>button]:rounded-none',
        today: '[&>button]:font-black [&>button]:text-amber-600',
        outside: '[&>button]:!text-slate-300 [&>button]:hover:!bg-transparent [&>button]:cursor-default',
        disabled: '[&>button]:opacity-30 [&>button]:cursor-not-allowed',
      }}
    />
  );

  const summary = (
    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
      <span className="text-sm text-slate-500 font-medium">{hasValue ? label : 'Elige un día o un rango'}</span>
      <div className="flex items-center gap-1">
        {hasValue && (
          <button
            type="button"
            onClick={() => { onClear(); if (!inline) setOpen(false); }}
            className="min-h-[44px] px-3 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-all"
          >
            Limpiar
          </button>
        )}
        {!inline && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={!hasValue}
            className="min-h-[44px] px-4 rounded-xl bg-slate-900 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition-all"
          >
            Listo
          </button>
        )}
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="rounded-2xl border border-slate-100 p-3">
        {calendar}
        {summary}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          ref={buttonRef}
          type="button"
          onClick={togglePopover}
          className={`flex min-h-[44px] items-center gap-2 px-4 rounded-xl border text-sm font-semibold transition-all ${
            hasValue
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-200 hover:text-slate-700'
          }`}
        >
          <CalendarDays size={14} className={hasValue ? 'text-amber-400' : 'text-slate-400'} />
          <span className="whitespace-nowrap">{label}</span>
        </button>
        {hasValue && (
          <button
            type="button"
            onClick={() => { onClear(); setOpen(false); }}
            aria-label="Quitar período"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {open && createPortal(
        <div
          ref={popoverRef}
          style={{ width: getPopoverWidth(monthCount), ...popoverStyle }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4"
        >
          {calendar}
          {summary}
        </div>,
        document.body,
      )}
    </>
  );
};
