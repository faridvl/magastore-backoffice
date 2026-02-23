import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import {
    Package, Edit3, Save, Truck, ChevronLeft,
    History, MapPin, ShoppingBag, AlertCircle, ExternalLink
} from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { useNavigation } from '@/hooks/use-navigation';

const PackageDetailPage: React.FC = () => {
    const router = useRouter();
    const navigation = useNavigation();
    const { id } = router.query;

    const [isEditingFinancial, setIsEditingFinancial] = useState(false);

    // Estado de los datos (Simulando carga desde Neon/API)
    const [data, setData] = useState({
        id: id || "101",
        tracking: '1ZF4W4400346171903',
        numPedido: "U10432927",
        tienda: 'New Balance',
        cliente: 'Sebastian Jimenez',
        casillero: 'C-26',
        fechaLlegadaPTY: '2025-05-21',
        peso: 3.0,
        estadoPaquete: 'TRANSITO',
        tarifaXLibre: 6,
        tipoCambio: 540,
        costoEnvioCorreos: 2500,
        costoPTY: 19044,
        estadoPago: 'PENDIENTE',
        nFactura: 'MG-1002',
        observaciones: 'El paquete viene en el contenedor de esta semana.'
    });

    // Historial (Bitácora de estados)
    const [bitacora] = useState([
        { id: 2, fecha: '2025-05-23 14:20', estado: 'TRANSITO', nota: 'Paquete en tránsito hacia Costa Rica', user: 'Admin' },
        { id: 3, fecha: '2025-05-21 09:00', estado: 'MIAMI', nota: 'Recibido en bodega Miami', user: 'Sist.' },
    ]);

    const [calculos, setCalculos] = useState({ totalPagar: 0, gananciaTotal: 0 });

    useEffect(() => {
        const subtotalPesoUSD = data.peso * data.tarifaXLibre;
        const totalClienteCRC = (subtotalPesoUSD * data.tipoCambio) + data.costoEnvioCorreos;
        const ganancia = totalClienteCRC - data.costoPTY;

        setCalculos({
            totalPagar: totalClienteCRC,
            gananciaTotal: ganancia
        });
    }, [data.peso, data.tarifaXLibre, data.tipoCambio, data.costoEnvioCorreos, data.costoPTY]);

    const handleSaveFinancial = () => {
        // Aquí llamarías a tu API para actualizar pesos y precios
        setIsEditingFinancial(false);
        console.log("Guardando cambios financieros...", data);
    };

    return (
        <>
            <Head><title>Detalle #{data.tracking} | Magastore</title></Head>
            <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title={`Gestión de Paquete ${data.casillero}`}>

                {/* Header de Acciones */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-neutral-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                        <ChevronLeft size={16} /> Volver al listado
                    </button>

                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={isEditingFinancial ? handleSaveFinancial : () => setIsEditingFinancial(true)}
                            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg ${isEditingFinancial
                                ? 'bg-green-600 text-white shadow-green-100 hover:bg-green-700'
                                : 'bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50 shadow-neutral-100'
                                }`}
                        >
                            {isEditingFinancial ? <><Save size={16} /> Guardar Precios</> : <><Edit3 size={16} /> Editar Precios y Peso</>}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* COLUMNA IZQUIERDA: Info General y Logística */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* 1. Información de Compra (Editable con isEditingFinancial) */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-8 border-b border-neutral-50 pb-5">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <ShoppingBag size={20} />
                                </div>
                                <Typography variant={TypographyVariant.BODY_BOLD}>Origen y Compra</Typography>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Tienda</label>
                                    {isEditingFinancial ? (
                                        <input type="text" value={data.tienda} onChange={(e) => setData({ ...data, tienda: e.target.value })} className="w-full p-2 bg-neutral-50 border-none rounded-lg font-bold text-sm focus:ring-2 focus:ring-blue-500" />
                                    ) : (
                                        <p className="font-bold text-neutral-800">{data.tienda}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest"># Pedido</label>
                                    <p className="font-bold text-neutral-800">#{data.numPedido}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Peso (Lbs)</label>
                                    {isEditingFinancial ? (
                                        <input type="number" value={data.peso} onChange={(e) => setData({ ...data, peso: Number(e.target.value) })} className="w-full p-2 bg-neutral-50 border-none rounded-lg font-bold text-sm focus:ring-2 focus:ring-blue-500" />
                                    ) : (
                                        <p className="font-bold text-neutral-800">{data.peso} LB</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 2. Estado Logístico (Visual + Link a Edición) */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
                            <div className="flex items-center justify-between mb-8 border-b border-neutral-50 pb-5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                        <Truck size={20} />
                                    </div>
                                    <Typography variant={TypographyVariant.BODY_BOLD}>Tracking y Ubicación</Typography>
                                </div>

                                <button
                                    onClick={() => navigation.admin.logistics.editPackage("U10432927")}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all group"
                                >
                                    <ExternalLink size={14} className="group-hover:scale-110 transition-transform" /> Actualizar Estado
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 flex flex-col justify-center">
                                    <span className="text-[10px] font-black text-neutral-400 uppercase block mb-1 tracking-widest">Estado Actual</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                                        <span className="font-black text-lg text-blue-700 uppercase tracking-tighter">
                                            {data.estadoPaquete.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono mt-3 text-neutral-500">Tracking: {data.tracking}</span>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-5 border border-neutral-100 rounded-2xl italic">
                                        <span className="text-[9px] font-black text-neutral-400 uppercase block mb-2 tracking-widest">Nota de este movimiento</span>
                                        <p className="text-sm font-medium text-neutral-600 leading-relaxed">
                                            "{data.observaciones}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Bitácora */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-8">
                                <History className="text-neutral-400" size={20} />
                                <Typography variant={TypographyVariant.BODY_BOLD}>Bitácora de Movimientos</Typography>
                            </div>

                            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-z-10 before:h-full before:w-0.5 before:bg-neutral-50">
                                {bitacora.map((item) => (
                                    <div key={item.id} className="relative flex items-start gap-6">
                                        <div className="mt-1 w-10 h-10 rounded-full bg-white border-4 border-neutral-50 flex items-center justify-center shrink-0">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{item.estado}</span>
                                                <span className="text-[10px] font-bold text-neutral-300">{item.fecha}</span>
                                            </div>
                                            <p className="text-sm font-bold text-neutral-700">{item.nota}</p>
                                            <span className="text-[10px] text-neutral-400 font-medium">Por: {item.user}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: Cobros */}
                    <div className="space-y-6">
                        <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-100 relative overflow-hidden">
                            <div className="absolute -right-6 -bottom-6 opacity-10">
                                <Package size={120} />
                            </div>
                            <p className="text-[10px] font-black text-blue-200 uppercase tracking-[0.2em] mb-4">Cliente Asignado</p>
                            <h3 className="text-2xl font-black mb-1">{data.cliente}</h3>
                            <div className="flex items-center gap-2 text-blue-100">
                                <MapPin size={14} />
                                <span className="text-xs font-bold uppercase tracking-widest">Casillero: {data.casillero}</span>
                            </div>
                        </div>

                        <div className="bg-neutral-900 rounded-[2.5rem] p-8 text-white shadow-2xl">
                            <div className="flex items-center justify-between mb-8 border-b border-neutral-800 pb-4">
                                <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Resumen Financiero</p>
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black ${data.estadoPago === 'PAGADO' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                                    }`}>
                                    {data.estadoPago}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-neutral-500 italic">Flete ({data.peso} lb x ${data.tarifaXLibre})</span>
                                    <span className="font-bold text-neutral-300">${(data.peso * data.tarifaXLibre).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-neutral-500">Tipo de Cambio</span>
                                    <span className="font-bold text-neutral-300">₡{data.tipoCambio}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-neutral-500">Envío Local</span>
                                    <span className="font-bold text-neutral-300">₡{data.costoEnvioCorreos.toLocaleString()}</span>
                                </div>

                                <div className="pt-6 mt-2 border-t border-neutral-800">
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-2">Total a Cobrar</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black italic text-white">₡{calculos.totalPagar.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="pt-6 bg-white/5 p-6 rounded-3xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-2 text-green-400">
                                        <AlertCircle size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Ganancia Neta</span>
                                    </div>
                                    <p className="text-2xl font-black text-green-400">₡{calculos.gananciaTotal.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </>
    );
};

// export const getServerSideProps = authorizeServerSidePage();
export default PackageDetailPage;