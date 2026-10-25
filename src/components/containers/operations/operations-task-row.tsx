import React from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { OperationsTaskRow } from './use-operations';

interface OperationsTaskRowViewProps {
  task: OperationsTaskRow;
  onAction: () => void;
}

// Toda la fila es el botón: en iPad un botón aparte dejaba el título en dos o tres líneas.
export const OperationsTaskRowView: React.FC<OperationsTaskRowViewProps> = ({ task, onAction }) => (
  <li>
    <button
      type="button"
      onClick={onAction}
      className="w-full min-h-[64px] flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 text-left active:bg-neutral-50"
    >
      <span
        className="h-11 w-11 shrink-0 rounded-2xl bg-primary-soft text-primary-dark flex items-center justify-center text-lg font-black tabular-nums"
      >
        {task.count}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block font-black text-neutral-900 leading-snug">{task.title}</span>
        <span className="block text-xs font-semibold text-neutral-500 mt-0.5">
          {task.countLabel}
          {task.missingCount ? ` · ${task.missingCount} sin guía` : ''}
        </span>
        {task.oldestLabel && (
          <span
            className={`mt-0.5 flex items-center gap-1 text-xs font-bold ${
              task.isStale ? 'text-danger-dark' : 'text-neutral-500'
            }`}
          >
            {task.isStale && <AlertTriangle size={13} className="shrink-0" aria-hidden />}
            {task.oldestLabel}
          </span>
        )}
        {task.paidStaleLabel && (
          <span className="mt-0.5 flex items-center gap-1 text-xs font-bold text-danger-dark">
            <AlertTriangle size={13} className="shrink-0" aria-hidden />
            {task.paidStaleLabel}
          </span>
        )}
      </span>

      <span className="h-9 w-9 shrink-0 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center">
        <ChevronRight size={18} aria-hidden />
      </span>
    </button>
  </li>
);
