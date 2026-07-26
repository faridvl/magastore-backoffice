import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Smile } from 'lucide-react';

/**
 * WhatsApp no interpreta HTML: el formato se escribe con marcadores dentro del
 * propio texto (*negrita*, _cursiva_, ~tachado~, ```monoespaciado```). La barra
 * inserta esos marcadores alrededor de la selección, y la vista previa los
 * renderiza para ver el resultado final.
 */
type WrapStyle = { prefix: string; suffix: string };

const STYLES: Record<string, WrapStyle> = {
  bold: { prefix: '*', suffix: '*' },
  italic: { prefix: '_', suffix: '_' },
  strike: { prefix: '~', suffix: '~' },
  mono: { prefix: '```', suffix: '```' },
};

const EMOJIS = ['📦', '✈️', '✅', '⚠️', '📍', '💰', '📅', '🕐', '👋', '🙏', '📱', '🚚'];

export interface WhatsAppEditorHandle {
  /** Inserta texto en la posición del cursor (usado por los chips de variables). */
  insertAtCursor: (text: string) => void;
}

interface WhatsAppEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

export const WhatsAppEditor = forwardRef<WhatsAppEditorHandle, WhatsAppEditorProps>(
  ({ value, onChange, rows = 16 }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    /** Aplica un cambio conservando el foco y dejando el cursor donde corresponde. */
    const applyChange = (next: string, cursorStart: number, cursorEnd: number) => {
      onChange(next);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(cursorStart, cursorEnd);
      });
    };

    const insertAtCursor = (text: string) => {
      const el = textareaRef.current;
      const start = el?.selectionStart ?? value.length;
      const end = el?.selectionEnd ?? value.length;
      const next = value.slice(0, start) + text + value.slice(end);
      applyChange(next, start + text.length, start + text.length);
    };

    useImperativeHandle(ref, () => ({ insertAtCursor }));

    /**
     * Envuelve la selección con los marcadores. Si ya estaba envuelta, los quita
     * — así el botón funciona como alternador, igual que en un editor normal.
     */
    const toggleWrap = (styleKey: keyof typeof STYLES) => {
      const { prefix, suffix } = STYLES[styleKey];
      const el = textareaRef.current;
      const start = el?.selectionStart ?? 0;
      const end = el?.selectionEnd ?? 0;
      const selected = value.slice(start, end);

      const before = value.slice(0, start);
      const after = value.slice(end);

      if (before.endsWith(prefix) && after.startsWith(suffix)) {
        const next = before.slice(0, -prefix.length) + selected + after.slice(suffix.length);
        applyChange(next, start - prefix.length, end - prefix.length);
        return;
      }

      if (selected.startsWith(prefix) && selected.endsWith(suffix) && selected.length > prefix.length + suffix.length) {
        const inner = selected.slice(prefix.length, selected.length - suffix.length);
        applyChange(before + inner + after, start, start + inner.length);
        return;
      }

      const next = `${before}${prefix}${selected}${suffix}${after}`;
      // Sin selección el cursor queda entre los marcadores, listo para escribir.
      const cursor = selected ? start + prefix.length + selected.length + suffix.length : start + prefix.length;
      applyChange(next, selected ? start : cursor, cursor);
    };

    /** Antepone un marcador de lista a cada línea seleccionada. */
    const applyList = (ordered: boolean) => {
      const el = textareaRef.current;
      const start = el?.selectionStart ?? 0;
      const end = el?.selectionEnd ?? 0;

      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEndRaw = value.indexOf('\n', end);
      const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;

      const block = value.slice(lineStart, lineEnd);
      const lines = block.split('\n');
      const marked = lines
        .map((line, i) => {
          const clean = line.replace(/^(\s*)([*-]|\d+\.)\s+/, '$1');
          if (!clean.trim()) return clean;
          return ordered ? `${i + 1}. ${clean}` : `* ${clean}`;
        })
        .join('\n');

      const next = value.slice(0, lineStart) + marked + value.slice(lineEnd);
      applyChange(next, lineStart, lineStart + marked.length);
    };

    const [showEmojis, setShowEmojis] = React.useState(false);

    const btnClass =
      'p-2.5 sm:p-2 rounded-lg text-slate-500 hover:bg-white hover:text-emerald-700 active:bg-white transition-colors';

    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-emerald-400/30 focus-within:border-emerald-400 transition-all">
        <div className="flex items-center gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-200 flex-wrap relative">
          <button type="button" onClick={() => toggleWrap('bold')} title="Negrita" className={btnClass}>
            <Bold size={15} />
          </button>
          <button type="button" onClick={() => toggleWrap('italic')} title="Cursiva" className={btnClass}>
            <Italic size={15} />
          </button>
          <button type="button" onClick={() => toggleWrap('strike')} title="Tachado" className={btnClass}>
            <Strikethrough size={15} />
          </button>
          <button type="button" onClick={() => toggleWrap('mono')} title="Monoespaciado" className={btnClass}>
            <Code size={15} />
          </button>

          <span className="w-px h-5 bg-slate-200 mx-1" />

          <button type="button" onClick={() => applyList(false)} title="Lista con viñetas" className={btnClass}>
            <List size={15} />
          </button>
          <button type="button" onClick={() => applyList(true)} title="Lista numerada" className={btnClass}>
            <ListOrdered size={15} />
          </button>

          <span className="w-px h-5 bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={() => setShowEmojis((v) => !v)}
            title="Emojis"
            className={`${btnClass} ${showEmojis ? 'bg-white text-emerald-700' : ''}`}
          >
            <Smile size={15} />
          </button>

          {showEmojis && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg p-2 grid grid-cols-6 gap-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    insertAtCursor(e);
                    setShowEmojis(false);
                  }}
                  className="p-2 text-lg hover:bg-slate-50 rounded-lg transition-colors"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full px-4 py-3 text-sm text-slate-700 outline-none leading-relaxed resize-y min-h-[280px] bg-white"
        />
      </div>
    );
  },
);

WhatsAppEditor.displayName = 'WhatsAppEditor';

/**
 * Convierte los marcadores de WhatsApp a HTML para la vista previa. Escapa el
 * texto primero: el contenido es editable por el operador y termina en
 * dangerouslySetInnerHTML.
 */
export function whatsappToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/```([\s\S]+?)```/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-[12px]">$1</code>')
    .replace(/(^|\s)\*([^*\n]+)\*/g, '$1<strong>$2</strong>')
    .replace(/(^|\s)_([^_\n]+)_/g, '$1<em>$2</em>')
    .replace(/(^|\s)~([^~\n]+)~/g, '$1<del>$2</del>');
}
