import React from 'react';

export interface StepTimelineItem {
  key: string;
  title: string;
  content: React.ReactNode;
  /**
   * El ítem de acción — el "Siguiente" de la card. Se resalta distinto (punto
   * verde) y queda empujado al fondo de la card: la línea que lo precede se
   * estira (flex-1) para llenar el espacio, así los "Siguiente" de las 4
   * cards quedan a la misma altura sin importar cuántos puntos tenga cada
   * paso arriba — pedido explícito del dueño.
   */
  isAction?: boolean;
}

/**
 * Timeline vertical dentro de cada card de paso — círculo + línea conectora
 * por ítem, como el historial de un pedido. Pedido explícito del dueño para
 * mobile: cada botón visible es su propio punto (sin agrupar varios botones
 * bajo un título compartido), en vez de quedar en fila/flex-wrap comprimido.
 *
 * A diferencia del stepper principal (círculos grandes arriba, que bloquea
 * pasos no activos), este timeline NO bloquea nada entre sus propios ítems —
 * es solo una guía visual de secuencia dentro de un paso ya activo. Todos los
 * ítems son igual de interactivos.
 */
export const StepTimeline: React.FC<{ items: StepTimelineItem[] }> = ({ items }) => (
  <div className="flex flex-col flex-1">
    {items.map((item, idx) => {
      const isLast = idx === items.length - 1;
      // La línea antes del ítem de acción (normalmente el último) se estira
      // para empujarlo al fondo de la card — el resto de las líneas son de
      // alto fijo, solo lo necesario para separar los puntos entre sí.
      const stretchLineAbove = !isLast && items[idx + 1]?.isAction;
      return (
        <div key={item.key} className={`flex gap-3 ${stretchLineAbove ? 'flex-1' : ''}`}>
          <div className="flex flex-col items-center flex-shrink-0">
            <div
              className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                item.isAction ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            />
            {!isLast && <div className={`w-px bg-slate-100 my-1 ${stretchLineAbove ? 'flex-1' : 'h-4'}`} />}
          </div>
          <div className={`min-w-0 flex-1 ${isLast ? '' : 'pb-3'}`}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              {item.title}
            </p>
            {item.content}
          </div>
        </div>
      );
    })}
  </div>
);
