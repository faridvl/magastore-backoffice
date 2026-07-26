import React from 'react';
import { useRouter } from 'next/router';
import { ChevronLeft, Check, AlertTriangle, Plus, RotateCcw, Loader2, Eye } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { WhatsAppEditor, WhatsAppEditorHandle, whatsappToHtml } from '@/components/common/whatsapp-editor/whatsapp-editor';
import { useWhatsAppTemplateDetail } from './use-whatsapp-template-detail';

/** Ejemplo de cómo se ve el mensaje ya con datos reales. */
const PREVIEW_VALUES: Record<string, string> = {
    nombre: 'María',
    nombre_completo: 'María Rodríguez',
    lista_paquetes: '* Amazon – 4.50 lb\n* SHEIN – 2.00 lb',
    peso_total: '6.50',
    id_orden: 'A1B2C3D4',
    metodo_entrega: 'Correos de Costa Rica',
    monto: '₡24,500',
    codigo: 'MGA-2453-C-11',
    ruta_label: 'USA Aéreo',
    direccion: '2610 NW 89TH CT',
    ciudad: 'Doral',
    estado: 'Florida',
    codigo_postal: '33172-1615',
    telefono: '+1 786-360-2816',
};

function renderPreview(body: string): string {
    return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => PREVIEW_VALUES[key] ?? match);
}

export const WhatsAppTemplateDetailContainer: React.FC = () => {
    const router = useRouter();
    const uuid = typeof router.query.uuid === 'string' ? router.query.uuid : undefined;
    const {
        template, isLoading, draft, variables, unknownVars,
        isDirty, canSave, isSaving,
        updateDraft, insertVariable, resetDraft, save, handleBack,
    } = useWhatsAppTemplateDetail(uuid);

    const [showPreview, setShowPreview] = React.useState(false);
    const editorRef = React.useRef<WhatsAppEditorHandle>(null);

    /**
     * Con el editor visible, la variable va donde está el cursor — su onChange
     * ya propaga el nuevo texto al borrador. En vista previa no hay cursor, así
     * que cae al append del hook.
     */
    const handleInsertVariable = (key: string) => {
        if (!showPreview && editorRef.current) {
            editorRef.current.insertAtCursor(`{{${key}}}`);
            return;
        }
        insertVariable(key);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 size={18} className="animate-spin mr-2" /> Cargando plantilla...
            </div>
        );
    }

    if (!template) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-3">
                <p className="text-sm text-slate-500">No se encontró la plantilla.</p>
                <button onClick={handleBack} className="text-xs font-bold text-emerald-700 underline underline-offset-2">
                    Volver a plantillas
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-28 lg:pb-4">
            <div>
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors text-[10px] font-black uppercase tracking-widest mb-2"
                >
                    <ChevronLeft size={14} /> Volver a plantillas
                </button>
                <Typography variant={TypographyVariant.HEADER} className="tracking-tighter">
                    {template.name}
                </Typography>
                {template.description && (
                    <p className="text-slate-400 text-xs mt-1 max-w-2xl leading-relaxed">{template.description}</p>
                )}
            </div>

            {/* En pantallas anchas el mensaje y las variables van lado a lado; en
                iPad vertical y móvil se apilan, con las variables debajo. */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Nombre</label>
                                <input
                                    type="text"
                                    value={draft.name}
                                    onChange={(e) => updateDraft('name', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Cuándo se usa</label>
                                <input
                                    type="text"
                                    value={draft.description}
                                    onChange={(e) => updateDraft('description', e.target.value)}
                                    placeholder="Nota para el equipo"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Mensaje</label>
                                <button
                                    onClick={() => setShowPreview((v) => !v)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${showPreview ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    <Eye size={12} /> {showPreview ? 'Editar' : 'Ver ejemplo'}
                                </button>
                            </div>

                            {showPreview ? (
                                <div className="bg-[#e5ddd5] rounded-xl p-3 sm:p-4">
                                    <div className="bg-white rounded-xl rounded-tl-sm px-4 py-3 shadow-sm max-w-lg">
                                        <div
                                            className="text-[13px] text-slate-700 whitespace-pre-wrap font-sans leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: whatsappToHtml(renderPreview(draft.body)) }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2.5 px-1">
                                        Ejemplo con datos de muestra. Al enviar se usan los del cliente real.
                                    </p>
                                </div>
                            ) : (
                                <WhatsAppEditor
                                    ref={editorRef}
                                    value={draft.body}
                                    onChange={(v) => updateDraft('body', v)}
                                />
                            )}
                        </div>

                        {unknownVars.length > 0 && (
                            <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                                <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                <p className="text-[11px] text-amber-700 leading-relaxed">
                                    Estas variables no existen en esta plantilla y se enviarían vacías:{' '}
                                    <span className="font-mono font-bold">{unknownVars.map((v) => `{{${v}}}`).join(', ')}</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Variables */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-3 lg:sticky lg:top-4">
                    <div>
                        <p className="text-[11px] font-bold text-slate-700">Variables disponibles</p>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            Al enviar el mensaje, cada variable se reemplaza por el dato real del cliente.
                            Tocá una para insertarla donde tenés el cursor.
                        </p>
                    </div>

                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                        {variables.map((v) => {
                            const used = draft.body.includes(`{{${v.key}}}`);
                            return (
                                <button
                                    key={v.key}
                                    onClick={() => handleInsertVariable(v.key)}
                                    className="w-full flex items-start justify-between gap-2 py-2.5 text-left group active:bg-slate-50 rounded-lg -mx-1 px-1"
                                >
                                    <div className="min-w-0">
                                        <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md inline-block">
                                            {`{{${v.key}}}`}
                                        </span>
                                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">{v.label}</p>
                                    </div>
                                    <span className="flex flex-col items-end gap-1 flex-shrink-0 pt-1">
                                        <Plus size={14} className="text-slate-300 group-hover:text-emerald-600 transition-colors" />
                                        {used && (
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">En uso</span>
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed">
                        Solo se pueden usar estas variables. Cualquier otra se enviaría vacía, por eso el sistema
                        no deja guardar si encuentra una que no existe.
                    </p>
                </div>
            </div>

            {/* Acciones — barra fija en móvil/iPad para no perderlas al scrollear */}
            <div className="fixed bottom-0 left-0 right-0 lg:static bg-white/95 backdrop-blur-sm border-t border-slate-100 lg:border-t-0 lg:bg-transparent lg:backdrop-blur-none px-4 py-3 lg:p-0 flex items-center gap-2 z-30 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] lg:shadow-none">
                <button
                    onClick={save}
                    disabled={!canSave || isSaving}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 lg:py-3 bg-emerald-600 text-white rounded-2xl text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-40"
                >
                    {isSaving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : <><Check size={14} /> Guardar cambios</>}
                </button>
                <button
                    onClick={resetDraft}
                    disabled={!isDirty || isSaving}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 lg:py-3 border border-slate-200 bg-white text-slate-500 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-40"
                >
                    <RotateCcw size={14} /> <span className="hidden sm:inline">Descartar</span>
                </button>
                {isDirty && (
                    <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider ml-auto lg:ml-3">
                        Sin guardar
                    </span>
                )}
            </div>
        </div>
    );
};
