import React from 'react';
import { useRouter } from 'next/router';
import { MessageCircle, Pencil, Power, ChevronRight } from 'lucide-react';
import { useWhatsAppTemplates } from './use-whatsapp-templates';
import { routesPrivate } from '@/shared/navigation/routes';

export const WhatsAppTemplatesContainer: React.FC = () => {
    const router = useRouter();
    const { templates, isLoading, handleToggleActive, isToggling } = useWhatsAppTemplates();

    const goToDetail = (uuid: string) => router.push(routesPrivate.admin.whatsappTemplateDetail(uuid));

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-xl flex-shrink-0">
                    <MessageCircle size={15} className="text-emerald-500" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">Plantillas de WhatsApp</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        Los mensajes que se envían a los clientes. Los cambios aplican de inmediato.
                    </p>
                </div>
            </div>

            <div className="divide-y divide-slate-100">
                {isLoading ? (
                    <p className="px-5 py-8 text-center text-slate-400 text-xs">Cargando...</p>
                ) : templates.length === 0 ? (
                    <p className="px-5 py-8 text-center text-slate-400 text-xs">Sin plantillas configuradas.</p>
                ) : templates.map((template) => (
                    <div
                        key={template.uuid}
                        className={`px-4 sm:px-5 py-4 ${!template.is_active ? 'opacity-40' : ''}`}
                    >
                        <div className="flex items-center justify-between gap-3">
                            {/* El área de texto navega al detalle; los botones se detienen aparte */}
                            <button
                                onClick={() => goToDetail(template.uuid)}
                                className="flex-1 min-w-0 text-left group"
                            >
                                <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">
                                    {template.name}
                                </p>
                                {template.description && (
                                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{template.description}</p>
                                )}
                            </button>

                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    onClick={() => handleToggleActive(template)}
                                    disabled={isToggling}
                                    title={template.is_active ? 'Desactivar' : 'Activar'}
                                    className={`p-2.5 rounded-lg transition-colors ${template.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-50'}`}
                                >
                                    <Power size={15} />
                                </button>
                                <button
                                    onClick={() => goToDetail(template.uuid)}
                                    className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                    title="Editar"
                                >
                                    <Pencil size={15} />
                                </button>
                                <ChevronRight size={15} className="text-slate-300 hidden sm:block" />
                            </div>
                        </div>

                        <button
                            onClick={() => goToDetail(template.uuid)}
                            className="w-full text-left mt-2.5"
                        >
                            <pre className="px-3 sm:px-4 py-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-500 whitespace-pre-wrap font-sans leading-relaxed max-h-20 overflow-hidden">
                                {template.body}
                            </pre>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
