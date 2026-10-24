import React, { useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import {
    Search, Package, Globe, CheckCircle,
    AlertCircle, RotateCcw, MessageCircle,
} from 'lucide-react';
import { PublicTrackingResult, PublicTrackingStatus } from '@/types/logistics/public-tracking.types';
import { formatBusinessDate } from '@/shared/utils/timezone';
import { formatWeight } from '@/shared/utils/format';
import { buildBusinessWhatsappHref } from '@/shared/constants/contact';

const LOGO_SRC = '/logo/magastore-logo-2026.png';
const LOGO_WIDTH = 1126;
const LOGO_HEIGHT = 718;
const HTTP_NOT_FOUND = 404;

const STATUS_LABELS: Record<PublicTrackingStatus, string> = {
    [PublicTrackingStatus.RECEIVED]: 'Recibido en bodega',
    [PublicTrackingStatus.PREPARING]: 'Preparando tu envío',
    [PublicTrackingStatus.EN_TRAMITE]: 'En camino a Costa Rica',
    [PublicTrackingStatus.ENTREGADO]: 'Entregado',
};

const LIFECYCLE: PublicTrackingStatus[] = [
    PublicTrackingStatus.RECEIVED,
    PublicTrackingStatus.EN_TRAMITE,
    PublicTrackingStatus.ENTREGADO,
];

const NEXT_STEP: Record<PublicTrackingStatus, string> = {
    [PublicTrackingStatus.RECEIVED]: 'Ya lo tenemos. Escríbenos por WhatsApp para pedir el envío a Costa Rica.',
    [PublicTrackingStatus.PREPARING]: 'Ya pediste el envío. Te avisamos por WhatsApp cuando salga.',
    [PublicTrackingStatus.EN_TRAMITE]: 'Va camino a Costa Rica. Te avisamos por WhatsApp cuando esté listo para entrega.',
    [PublicTrackingStatus.ENTREGADO]: '',
};

enum SearchError {
    NOT_FOUND = 'NOT_FOUND',
    SERVER = 'SERVER',
}

const ERROR_MESSAGES: Record<SearchError, string> = {
    [SearchError.NOT_FOUND]: 'No encontramos ese número. Aparece cuando lo registremos, unos días después de que la tienda lo entregue.',
    [SearchError.SERVER]: 'No pudimos buscar tu paquete. Revisa tu conexión e intenta de nuevo.',
};

/** Fecha en que el paquete llegó a ese paso: la de llegada para el primero, la del evento para el resto. */
function stepDate(result: PublicTrackingResult, status: PublicTrackingStatus): string | null {
    if (status === PublicTrackingStatus.PREPARING) return stepDate(result, PublicTrackingStatus.RECEIVED);
    if (status === PublicTrackingStatus.RECEIVED && result.arrival_date) return result.arrival_date;
    return result.events.find((ev) => ev.status === status)?.created_at ?? null;
}

const TrackingPage: React.FC = () => {
    const [search, setSearch] = useState('');
    const [result, setResult] = useState<PublicTrackingResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<SearchError | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchedQuery, setSearchedQuery] = useState('');

    const runSearch = async () => {
        const q = search.trim();
        if (!q) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setHasSearched(true);
        setSearchedQuery(q);

        try {
            const res = await fetch(`/api/tracking?q=${encodeURIComponent(q)}`);

            if (!res.ok) {
                setError(res.status === HTTP_NOT_FOUND ? SearchError.NOT_FOUND : SearchError.SERVER);
                return;
            }

            const body = await res.json();
            setResult(body.data);
        } catch {
            setError(SearchError.SERVER);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        void runSearch();
    };

    // Preparando el envío cuenta como paso 1 hecho y paso 2 pendiente.
    const currentIndex = result
        ? LIFECYCLE.indexOf(result.status === PublicTrackingStatus.PREPARING ? PublicTrackingStatus.RECEIVED : result.status)
        : -1;
    const isDelivered = result?.status === PublicTrackingStatus.ENTREGADO;
    const currentDate = result ? stepDate(result, result.status) : null;

    const timeline = LIFECYCLE.map((status, index) => {
        const iso = result ? stepDate(result, status) : null;
        return {
            status,
            label: STATUS_LABELS[status],
            completed: index <= currentIndex,
            current: index === currentIndex,
            date: iso ? formatBusinessDate(iso) : null,
        };
    });

    const showResult = result || error || loading;

    return (
        <>
            <Head><title>Rastreo de Carga | Magastore</title></Head>
            <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Rastreo de Carga" hideSidebar={true}>

                <div className="flex flex-col min-h-full">

                    {/* ZONA BUSCADOR — centrado verticalmente cuando no hay resultado, arriba cuando sí */}
                    <div className={`transition-all duration-500 w-full px-4 md:px-8 ${showResult ? 'pt-6 pb-4' : 'flex-1 flex flex-col items-center justify-center py-12'}`}>

                        {/* Título solo visible en estado idle */}
                        {!hasSearched && (
                            <div className="text-center mb-8 animate-in fade-in duration-500">
                                <div className="bg-slate-900 rounded-2xl px-5 py-3 inline-flex mx-auto mb-4">
                                    <Image
                                        src={LOGO_SRC}
                                        alt="Magastore"
                                        width={LOGO_WIDTH}
                                        height={LOGO_HEIGHT}
                                        priority
                                        className="h-14 w-auto"
                                    />
                                </div>
                                <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Rastrear Paquete</h2>
                                <p className="text-slate-500 text-sm mt-1">Ingresa el número de tracking para ver el estado de tu envío</p>
                            </div>
                        )}

                        <div className={`w-full ${showResult ? 'max-w-2xl' : 'max-w-xl'} mx-auto`}>
                            <div className="bg-white rounded-[1.75rem] shadow-xl shadow-amber-900/5 border border-slate-100 flex items-center p-2">
                                <div className="pl-3 md:pl-4 pr-2 md:pr-3 text-amber-500 flex-shrink-0">
                                    <Search size={20} />
                                </div>
                                <form onSubmit={handleSearch} className="flex-1 flex min-w-0">
                                    <input
                                        type="text"
                                        placeholder="Número de tracking..."
                                        aria-label="Número de tracking"
                                        className="w-full py-3 md:py-3.5 bg-transparent border-none focus:ring-0 font-bold text-slate-700 placeholder:text-slate-300 text-sm md:text-base min-w-0"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        autoComplete="off"
                                        autoCapitalize="characters"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        enterKeyHint="search"
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-amber-600 text-white px-5 md:px-7 py-2.5 rounded-2xl font-black hover:bg-amber-700 active:scale-95 transition-all shadow-md shadow-amber-200 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap text-sm flex-shrink-0"
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                                                <span className="hidden sm:inline">Buscando</span>
                                            </span>
                                        ) : 'Rastrear'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* RESULTADOS */}
                    {hasSearched && (
                        <div className="flex-1 px-4 md:px-8 pb-10">

                            {/* Error */}
                            {error && (
                                <div className="max-w-2xl mx-auto mb-6 animate-in fade-in duration-300">
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-red-500 text-white p-2.5 rounded-xl flex-shrink-0">
                                                <AlertCircle size={18} />
                                            </div>
                                            <p className="text-red-700 font-bold text-sm">{ERROR_MESSAGES[error]}</p>
                                        </div>
                                        {error === SearchError.SERVER && (
                                            <button
                                                type="button"
                                                onClick={() => void runSearch()}
                                                className="self-start inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl bg-white border border-red-200 text-red-700 text-sm font-bold hover:bg-red-100 transition-colors"
                                            >
                                                <RotateCcw size={14} /> Reintentar
                                            </button>
                                        )}
                                        {error === SearchError.NOT_FOUND && (
                                            <a
                                                href={buildBusinessWhatsappHref(`Hola, no encuentro mi paquete ${searchedQuery}`)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="self-start inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl bg-white border border-red-200 text-red-700 text-sm font-bold hover:bg-red-100 transition-colors"
                                            >
                                                <MessageCircle size={14} /> Escríbenos por WhatsApp
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Loading skeleton */}
                            {loading && (
                                <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 animate-pulse">
                                    <div className="space-y-4">
                                        <div className="bg-slate-800 rounded-2xl h-24" />
                                        <div className="bg-white rounded-2xl h-40 border border-slate-100" />
                                    </div>
                                    <div className="lg:col-span-2 bg-white rounded-2xl h-80 border border-slate-100" />
                                </div>
                            )}

                            {/* Resultado */}
                            {result && (
                                <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 animate-in fade-in slide-in-from-bottom-3 duration-500">

                                    {/* Columna izquierda: estado (primero en celular) + detalles */}
                                    <div className="flex flex-col gap-4">

                                        {/* Tarjeta estado actual */}
                                        <div className="bg-slate-900 rounded-2xl p-4 md:p-6 text-white shadow-lg shadow-amber-900/10">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Globe size={13} className="text-amber-400" />
                                                <span className="text-xs font-semibold text-slate-400">Estado actual</span>
                                            </div>
                                            <h3 className="text-xl font-black tracking-tight">
                                                {STATUS_LABELS[result.status]}
                                            </h3>
                                            {isDelivered ? (
                                                currentDate && (
                                                    <p className="text-slate-300 text-sm mt-2 leading-snug">
                                                        El {formatBusinessDate(currentDate)}.
                                                    </p>
                                                )
                                            ) : (
                                                <>
                                                    {currentDate && (
                                                        <p className="text-slate-400 text-xs mt-2 font-medium">
                                                            Desde el {formatBusinessDate(currentDate)}
                                                        </p>
                                                    )}
                                                    <p className="text-slate-300 text-sm mt-2 leading-snug">
                                                        {NEXT_STEP[result.status]}
                                                    </p>
                                                    {result.status === PublicTrackingStatus.RECEIVED && (
                                                        <a
                                                            href={buildBusinessWhatsappHref(`Hola, quiero pedir el envío del paquete ${result.tracking_number}`)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="mt-3 inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 transition-colors"
                                                        >
                                                            <MessageCircle size={16} /> Escríbenos por WhatsApp
                                                        </a>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* Tarjeta detalles */}
                                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6">
                                            <div className="flex items-center gap-2.5 mb-4">
                                                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                                                    <Package size={16} />
                                                </div>
                                                <span className="text-xs font-semibold text-slate-600">Detalles</span>
                                            </div>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs text-slate-500">Tracking</p>
                                                    <p className="font-mono text-xs font-bold text-amber-600 break-all mt-0.5">{result.tracking_number}</p>
                                                </div>
                                                <div className="border-t border-slate-50 pt-3 flex justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-slate-500">Cliente</p>
                                                        <p className="text-sm font-bold text-slate-700 mt-0.5">{result.customer_name ?? 'Sin registrar'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-slate-500">Peso</p>
                                                        <p className="text-sm font-bold text-slate-700 mt-0.5 whitespace-nowrap">{formatWeight(result.weight_lb)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Columna derecha: timeline */}
                                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-8">
                                        <p className="text-xs font-semibold text-slate-500 mb-5">Historial de seguimiento</p>
                                        <div className="relative space-y-6 md:space-y-10">
                                            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100" />
                                            {timeline.map((step) => {
                                                const isActive = step.current && step.status !== PublicTrackingStatus.ENTREGADO;
                                                return (
                                                    <div key={step.status} className="relative flex gap-5 md:gap-6">
                                                        <div className={`z-10 h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white transition-all flex-shrink-0 ${
                                                            isActive
                                                                ? 'bg-amber-600 shadow-md shadow-amber-200'
                                                                : step.completed
                                                                ? 'bg-emerald-500'
                                                                : 'bg-slate-200'
                                                        }`}>
                                                            {step.completed
                                                                ? <CheckCircle size={15} className="text-white" />
                                                                : <div className="h-2 w-2 rounded-full bg-white opacity-50" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0 pt-0.5">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <h4 className={`font-black text-sm leading-tight ${
                                                                    isActive ? 'text-amber-600' : step.completed ? 'text-slate-800' : 'text-slate-400'
                                                                }`}>
                                                                    {step.label}
                                                                </h4>
                                                                {step.date && (
                                                                    <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md whitespace-nowrap flex-shrink-0">
                                                                        {step.date}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>
                    )}

                </div>

            </DashboardLayout>
        </>
    );
};

export default TrackingPage;
