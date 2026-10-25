import React, { useEffect, useState } from 'react';
import { Check, SlidersHorizontal, X } from 'lucide-react';
import { tailwind } from '@/utils/tailwind-utils';

export interface FilterBarOption {
  label: string;
  value: string;
}

export interface FilterBarField {
  key: string;
  label: string;
  options: FilterBarOption[];
  /** Si se define, el chip del filtro activo dice "prefijo: opción" en vez de solo la opción. */
  chipPrefix?: string;
  /** Texto cuando no hay nada marcado (p. ej. "Todos los pasos"). */
  emptyLabel: string;
  /** Una sola opción a la vez: tocar la marcada la desmarca. */
  value?: string | null;
  onChange?: (value: string | null) => void;
  /** Varias opciones a la vez; la lista vacía significa "todas". */
  values?: string[];
  onValuesChange?: (values: string[]) => void;
}

interface FilterBarProps {
  /** Siempre a la vista junto al botón de filtros: buscador y acción principal. */
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  fields: FilterBarField[];
  /** Contenido extra del panel, debajo de los grupos (p. ej. el rango de fechas). */
  extraPanelContent?: React.ReactNode;
  extraActiveCount?: number;
  /** Chips de lo que eligió el contenido extra (p. ej. "Creadas 1–9 oct"), quitables con un toque. */
  extraChips?: { key: string; label: string; onRemove: () => void }[];
  onClearExtra?: () => void;
  resultCount?: number;
}

const isMultiple = (field: FilterBarField) => field.values !== undefined;
const selectedValues = (field: FilterBarField) =>
  isMultiple(field) ? field.values ?? [] : field.value ? [field.value] : [];
const clearField = (field: FilterBarField) =>
  isMultiple(field) ? field.onValuesChange?.([]) : field.onChange?.(null);

const toggleOption = (field: FilterBarField, optionValue: string) => {
  if (!isMultiple(field)) {
    field.onChange?.(field.value === optionValue ? null : optionValue);
    return;
  }
  const current = field.values ?? [];
  field.onValuesChange?.(
    current.includes(optionValue) ? current.filter((v) => v !== optionValue) : [...current, optionValue],
  );
};

const OptionMark: React.FC<{ isSelected: boolean; isMultiple: boolean }> = ({ isSelected, isMultiple: multiple }) => (
  <span
    aria-hidden
    className={tailwind(
      'flex h-4 w-4 shrink-0 items-center justify-center border transition-colors',
      multiple ? 'rounded' : 'rounded-full',
      isSelected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white',
    )}
  >
    {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
  </span>
);

/**
 * Barra de filtros de un listado: a la vista quedan el buscador, un botón
 * "Filtros" con el número de filtros activos y los activos como chips que se
 * quitan con un toque. Las opciones viven en un panel (hoja en móvil) como
 * casillas: varios selectores en línea se cortaban en un teléfono.
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  leading,
  trailing,
  fields,
  extraPanelContent,
  extraActiveCount = 0,
  extraChips = [],
  onClearExtra,
  resultCount,
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    if (!isPanelOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsPanelOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPanelOpen]);

  const activeCount = fields.filter((f) => selectedValues(f).length > 0).length + extraActiveCount;
  const clearAll = () => {
    fields.forEach(clearField);
    onClearExtra?.();
  };

  const chips = fields.flatMap((field) =>
    selectedValues(field).map((value) => ({
      key: `${field.key}-${value}`,
      label: [field.chipPrefix, field.options.find((o) => o.value === value)?.label ?? value]
        .filter(Boolean)
        .join(': '),
      onRemove: () => toggleOption(field, value),
    })),
  ).concat(extraChips);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">{leading}</div>
        {/* En móvil un control por fila: juntos no cabían sin apretarse. */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => setIsPanelOpen(true)}
            aria-haspopup="dialog"
            className={tailwind(
              'flex flex-1 sm:flex-none items-center justify-center gap-2 min-h-[44px] px-4 rounded-full border bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors',
              activeCount > 0 ? 'border-slate-800' : 'border-slate-200',
            )}
          >
            <SlidersHorizontal size={16} aria-hidden />
            Filtros
            {activeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-xs font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>
          {trailing}
        </div>
      </div>

      {(chips.length > 0 || extraActiveCount > 0) && (
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <span
                key={chip.key}
                className="flex h-11 shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white pl-3 pr-0.5 text-sm text-slate-800"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={`Quitar filtro ${chip.label}`}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                >
                  <X size={14} aria-hidden />
                </button>
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={clearAll}
            className="min-h-[44px] shrink-0 px-2 text-sm font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900"
          >
            Limpiar
          </button>
        </div>
      )}

      {isPanelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-slate-900/60 lg:items-center lg:p-6"
          onClick={() => setIsPanelOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filtros"
            className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white lg:max-w-xl lg:rounded-[28px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative flex items-center justify-center border-b border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                aria-label="Cerrar filtros"
                className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
              >
                <X size={20} aria-hidden />
              </button>
              <h2 className="text-base font-bold text-slate-900">Filtros</h2>
            </div>

            <div className="flex flex-col divide-y divide-slate-100 overflow-y-auto overscroll-contain px-5">
              {fields.map((field) => {
                const selected = selectedValues(field);
                const multiple = isMultiple(field);
                return (
                  <fieldset key={field.key} className="flex flex-col gap-2.5 py-4">
                    <legend className="contents">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-bold text-slate-900">{field.label}</span>
                        {selected.length === 0 ? (
                          <span className="text-sm text-slate-500">{field.emptyLabel}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => clearField(field)}
                            className="min-h-[44px] px-1 text-sm font-medium text-slate-700 underline underline-offset-2"
                          >
                            Limpiar
                          </button>
                        )}
                      </span>
                    </legend>
                    <div className="flex flex-wrap gap-2" role={multiple ? 'group' : 'radiogroup'} aria-label={field.label}>
                      {field.options.map((option) => {
                        const isSelected = selected.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role={multiple ? 'checkbox' : 'radio'}
                            aria-checked={isSelected}
                            onClick={() => toggleOption(field, option.value)}
                            className={tailwind(
                              'flex min-h-[44px] items-center gap-2 rounded-full border pl-3 pr-4 text-sm font-medium transition-colors',
                              isSelected
                                ? 'border-slate-900 bg-slate-50 text-slate-900'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400',
                            )}
                          >
                            <OptionMark isSelected={isSelected} isMultiple={multiple} />
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                );
              })}
              {extraPanelContent && <div className="py-4">{extraPanelContent}</div>}
            </div>

            {resultCount === 0 && (
              <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600">Ningún resultado cumple estos filtros.</p>
            )}
            <div
              className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              <button
                type="button"
                onClick={clearAll}
                disabled={activeCount === 0}
                className="min-h-[44px] px-1 text-sm font-semibold text-slate-800 underline underline-offset-2 disabled:text-slate-300 disabled:no-underline"
              >
                Limpiar todo
              </button>
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                className="min-h-[44px] px-5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
              >
                {resultCount === undefined ? 'Aplicar' : resultCount === 0 ? 'Sin resultados' : `Ver ${resultCount} resultado${resultCount === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
