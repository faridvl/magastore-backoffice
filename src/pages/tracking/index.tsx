import React, { useState } from 'react';
import Head from 'next/head';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import {
    Search, Package, Truck, Globe, CheckCircle,
    MapPin, AlertCircle,
} from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';

interface TrackingEvent {
    id: number;
    status: string;
    event_type: string;
    description: string;
    location: string;
    created_at: string;
}

interface TrackingResult {
    uuid: string;
    tracking_number: string;
    status: string;
    weight_lb: number;
    arrival_date: string | null;
    first_name: string | null;
    last_name: string | null;
    customer_code: string | null;
    events: TrackingEvent[];
}

const STATUS_LABELS: Record<string, string> = {
    MIAMI: 'En Miami',
    TRANSITO: 'En Tránsito',
    ADUANA: 'En Aduana',
    BODEGA_CR: 'En Bodega CR',
    ENTREGADO: 'Entregado',
};

const LIFECYCLE: Array<{ status: string; label: string; location: string }> = [
    { status: 'MIAMI', label: 'Recibido en Miami', location: 'Bodega Florida' },
    { status: 'TRANSITO', label: 'En Tránsito', location: 'Logística Internacional' },
    { status: 'ADUANA', label: 'En Aduana', location: 'San José, CR' },
    { status: 'BODEGA_CR', label: 'En Bodega CR', location: 'Sucursal Magastore' },
    { status: 'ENTREGADO', label: 'Entregado al Cliente', location: 'Destino Final' },
];

const STATUS_ORDER = ['MIAMI', 'TRANSITO', 'ADUANA', 'BODEGA_CR', 'ENTREGADO'];

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-CR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
    });
}

const TrackingPage: React.FC = () => {
    const [search, setSearch] = useState('');
    const [result, setResult] = useState<TrackingResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const q = search.trim();
        if (!q) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setHasSearched(true);

        try {
            const res = await fetch(`/api/tracking?q=${encodeURIComponent(q)}`);
            const body = await res.json();

            if (!res.ok) {
                setError(body.message || 'No se encontró el paquete.');
                return;
            }

            setResult(body.data);
        } catch {
            setError('Error al conectar con el servidor. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const currentIndex = result ? STATUS_ORDER.indexOf(result.status) : -1;

    const timeline = LIFECYCLE.map((step, index) => {
        const event = result?.events.find((ev) => ev.status === step.status);
        return {
            ...step,
            completed: index <= currentIndex,
            current: index === currentIndex,
            date: event ? formatDate(event.created_at) : '-',
            location: event?.location || step.location,
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
                                <div className="bg-amber-50 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-500">
                                    <Truck size={32} />
                                </div>
                                <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Rastrear Paquete</h2>
                                <p className="text-slate-400 text-sm mt-1">Ingresa el número de tracking para ver el estado de tu envío</p>
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
                                        className="w-full py-3 md:py-3.5 bg-transparent border-none focus:ring-0 font-bold text-slate-700 placeholder:text-slate-300 text-sm md:text-base min-w-0"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        autoComplete="off"
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
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
                                        <div className="bg-red-500 text-white p-2.5 rounded-xl flex-shrink-0">
                                            <AlertCircle size={18} />
                                        </div>
                                        <p className="text-red-700 font-bold text-sm">{error}</p>
                                    </div>
                                </div>
                            )}

                            {/* Loading skeleton */}
                            {loading && (
                                <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 animate-pulse">
                                    <div className="space-y-4">
                                        <div className="bg-white rounded-2xl h-40 border border-slate-100" />
                                        <div className="bg-slate-800 rounded-2xl h-24" />
                                    </div>
                                    <div className="lg:col-span-2 bg-white rounded-2xl h-80 border border-slate-100" />
                                </div>
                            )}

                            {/* Resultado */}
                            {result && (
                                <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 animate-in fade-in slide-in-from-bottom-3 duration-500">

                                    {/* Columna izquierda: detalles + estado */}
                                    <div className="flex flex-col gap-4">

                                        {/* Tarjeta detalles */}
                                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6">
                                            <div className="flex items-center gap-2.5 mb-4">
                                                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                                                    <Package size={16} />
                                                </div>
                                                <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Detalles</span>
                                            </div>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tracking</p>
                                                    <p className="font-mono text-xs font-bold text-amber-600 break-all mt-0.5">{result.tracking_number}</p>
                                                </div>
                                                <div className="border-t border-slate-50 pt-3 flex justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cliente</p>
                                                        <p className="text-sm font-bold text-slate-700 mt-0.5">{result.first_name} {result.last_name}</p>
                                                        {result.customer_code && (
                                                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">{result.customer_code}</p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Peso</p>
                                                        <p className="text-sm font-bold text-slate-700 mt-0.5">{result.weight_lb} LB</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tarjeta estado actual */}
                                        <div className="bg-slate-900 rounded-2xl p-4 md:p-6 text-white shadow-lg shadow-amber-900/10">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Globe size={13} className="text-amber-400" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Estado Actual</span>
                                            </div>
                                            <h3 className="text-xl font-black tracking-tight">
                                                {STATUS_LABELS[result.status] ?? result.status}
                                            </h3>
                                            {result.arrival_date && (
                                                <p className="text-slate-500 text-xs mt-2 font-medium">
                                                    Llegó: {formatDate(result.arrival_date)}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Columna derecha: timeline */}
                                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-8">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-5">Historial de Seguimiento</p>
                                        <div className="relative space-y-6 md:space-y-10">
                                            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100" />
                                            {timeline.map((step, index) => (
                                                <div key={index} className="relative flex gap-5 md:gap-6">
                                                    <div className={`z-10 h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white transition-all flex-shrink-0 ${
                                                        step.current
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
                                                            <h4 className={`font-black text-sm uppercase tracking-wide leading-tight ${
                                                                step.current ? 'text-amber-600' : step.completed ? 'text-slate-800' : 'text-slate-300'
                                                            }`}>
                                                                {step.label}
                                                            </h4>
                                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md whitespace-nowrap flex-shrink-0">
                                                                {step.date}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                                                            <MapPin size={11} />
                                                            <span className="text-xs font-medium">{step.location}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
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
