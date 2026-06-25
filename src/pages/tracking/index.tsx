import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import {
    Search, Package, Truck, Globe, CheckCircle,
    MapPin, ArrowLeft, AlertCircle,
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
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [result, setResult] = useState<TrackingResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const q = search.trim();
        if (!q) return;

        setLoading(true);
        setError(null);
        setResult(null);

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

    return (
        <>
            <Head><title>Rastreo de Carga | Magastore</title></Head>
            <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Rastreo de Carga" hideSidebar={true}>

                <div className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 text-neutral-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest transition-all group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Volver al Backoffice
                    </button>

                    {result && (
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-full uppercase tracking-widest">
                            Vista de Cliente Activa
                        </span>
                    )}
                </div>

                <div className="max-w-3xl mx-auto mb-12">
                    <div className="bg-white p-2 rounded-[2rem] shadow-xl shadow-blue-900/5 border border-neutral-100 flex items-center">
                        <div className="pl-6 pr-4 text-blue-600">
                            <Search size={24} />
                        </div>
                        <form onSubmit={handleSearch} className="flex-1 flex">
                            <input
                                type="text"
                                placeholder="Introduce el número de tracking..."
                                className="w-full py-4 bg-transparent border-none focus:ring-0 font-bold text-neutral-700 placeholder:text-neutral-300"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Buscando...' : 'Rastrear'}
                            </button>
                        </form>
                    </div>
                </div>

                {error && (
                    <div className="max-w-3xl mx-auto mb-8">
                        <div className="bg-red-50 border border-red-100 rounded-3xl p-5 flex items-center gap-4">
                            <div className="bg-red-500 text-white p-3 rounded-2xl">
                                <AlertCircle size={22} />
                            </div>
                            <p className="text-red-700 font-bold text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {result ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">

                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package size={20} /></div>
                                    <Typography variant={TypographyVariant.BODY_BOLD}>Detalles del Envío</Typography>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Tracking</p>
                                        <p className="font-mono text-sm font-bold text-blue-600 break-all">{result.tracking_number}</p>
                                    </div>
                                    <div className="flex justify-between border-t border-neutral-50 pt-4">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Cliente</p>
                                            <p className="text-sm font-bold text-neutral-700">
                                                {result.first_name} {result.last_name}
                                                {result.customer_code && (
                                                    <span className="text-neutral-400 font-medium"> ({result.customer_code})</span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Peso</p>
                                            <p className="text-sm font-bold text-neutral-700">{result.weight_lb} LB</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-neutral-900 p-8 rounded-3xl text-white shadow-xl shadow-blue-900/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <Globe size={16} className="text-blue-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Estado Actual</span>
                                </div>
                                <h3 className="text-2xl font-black tracking-tight">
                                    {STATUS_LABELS[result.status] ?? result.status}
                                </h3>
                                {result.arrival_date && (
                                    <p className="text-neutral-500 text-xs mt-2 font-medium">
                                        Llegó: {formatDate(result.arrival_date)}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-white p-8 md:p-12 rounded-3xl border border-neutral-100 shadow-sm">
                            <div className="relative space-y-12">
                                <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-neutral-100" />
                                {timeline.map((step, index) => (
                                    <div key={index} className="relative flex gap-8">
                                        <div className={`z-10 h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white transition-all ${step.current ? 'bg-blue-600 shadow-lg shadow-blue-200' :
                                            step.completed ? 'bg-green-500' : 'bg-neutral-200'
                                            }`}>
                                            {step.completed
                                                ? <CheckCircle size={16} className="text-white" />
                                                : <div className="h-2 w-2 rounded-full bg-white opacity-50" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-1">
                                                <h4 className={`font-black text-sm uppercase tracking-wide ${step.current ? 'text-blue-600' : step.completed ? 'text-neutral-800' : 'text-neutral-400'}`}>
                                                    {step.label}
                                                </h4>
                                                <span className="text-[10px] font-bold text-neutral-400 bg-neutral-50 px-2 py-1 rounded-md">
                                                    {step.date}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1 text-neutral-400">
                                                <MapPin size={12} />
                                                <span className="text-xs font-medium">{step.location}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : !loading && !error && (
                    <div className="text-center py-20 opacity-40">
                        <div className="bg-neutral-100 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6 text-neutral-300">
                            <Truck size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-neutral-400 italic">Ingresa un número para rastrear tu pedido</h3>
                    </div>
                )}
            </DashboardLayout>
        </>
    );
};

export default TrackingPage;
