import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import {
    Package, Edit3, Save, Truck, ChevronLeft, DollarSign, Scale,
    Info, History, MapPin, Boxes, ShoppingBag, Calendar, Hash
} from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';

const PackageDetailPage: React.FC = () => {
    const router = useRouter();
    const { id } = router.query;

    const [isEditing, setIsEditing] = useState(false);

    // Data completa basada en tus archivos BD PAQUETES y FACTURACION
    const [data, setData] = useState({
        // Datos de Identificación
        idOrden: "101",
        tracking: '1ZF4W4400346171903',
        numPedido: "U10432927",
        tienda: 'New Balance',
        cliente: 'Sebastian Jimenez',
        casillero: 'C-26',

        // Logística
        fechaCompra: '2025-05-10',
        fechaLlegadaPTY: '2025-05-21',
        peso: 3.0,
        estadoPaquete: 'ENTREGADO',
        idConsolidado: 'CON-001',
        tipoPaquete: 'Aéreo',

        // Valores de Compra (USD)
        valorPedidoUSD: 69.99,
        impuestosUSD: 0.00,

        // Facturación y Costos (CRC)
        tarifaXLibre: 6, // USD
        tipoCambio: 540,
        costoEnvioCorreos: 2500,
        costoPTY: 19044, // Lo que te cuesta a ti
        estadoPago: 'PAGADO',
        nFactura: 'MG-1002',
        observaciones: 'Observaciones de prueba'
    });

    const [calculos, setCalculos] = useState({ totalPagar: 0, gananciaTotal: 0 });

    useEffect(() => {
        // Lógica de cálculo real de tus excels
        const subtotalPesoUSD = data.peso * data.tarifaXLibre;
        const totalClienteCRC = (subtotalPesoUSD * data.tipoCambio) + data.costoEnvioCorreos;
        const ganancia = totalClienteCRC - data.costoPTY;

        setCalculos({
            totalPagar: totalClienteCRC,
            gananciaTotal: ganancia
        });
    }, [data.peso, data.tarifaXLibre, data.tipoCambio, data.costoEnvioCorreos, data.costoPTY]);

    return (
        <>
            <Head><title>Detalle #{data.tracking} | Magastore</title></Head>
            <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title={`Paquete ${data.casillero}`}>

                {/* Botón de Regreso y Acciones */}
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-neutral-400 hover:text-blue-600 font-bold text-xs uppercase transition-all">
                        <ChevronLeft size={16} /> Volver
                    </button>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${isEditing ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {isEditing ? <><Save size={14} /> Guardar Cambios</> : <><Edit3 size={14} /> Editar Información</>}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* COLUMNA IZQUIERDA: Info de Compra y Logística */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* 1. Datos del Pedido (Source) */}
                        <div className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-6 border-b border-neutral-50 pb-4">
                                <ShoppingBag className="text-blue-600" size={20} />
                                <Typography variant={TypographyVariant.BODY_BOLD}>Origen y Compra</Typography>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-[10px] font-black text-neutral-400 uppercase mb-1">Tienda</p>
                                    <p className="font-bold text-neutral-800">{data.tienda}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-neutral-400 uppercase mb-1"># Pedido Tienda</p>
                                    <p className="font-bold text-neutral-800">#{data.numPedido}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-neutral-400 uppercase mb-1">Valor Mercancía</p>
                                    <p className="font-bold text-neutral-800">${data.valorPedidoUSD}</p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Logística y Tracking (Core) */}
                        <div className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-6 border-b border-neutral-50 pb-4">
                                <Truck className="text-blue-600" size={20} />
                                <Typography variant={TypographyVariant.BODY_BOLD}>Estado Logístico</Typography>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                                        <span className="text-xs font-bold text-neutral-500">Tracking:</span>
                                        <span className="font-mono text-sm font-black text-blue-600">{data.tracking}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                                        <span className="text-xs font-bold text-neutral-500">Estado:</span>
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase">
                                            {data.estadoPaquete}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                                        <span className="text-xs font-bold text-neutral-500">Peso Registrado:</span>
                                        <span className="font-black text-neutral-800">{data.peso} LB</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                                        <span className="text-xs font-bold text-neutral-500">Llegada a PTY:</span>
                                        <span className="font-bold text-neutral-800">{data.fechaLlegadaPTY}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Notas / Observaciones */}
                        <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm">
                            <p className="text-[10px] font-black text-neutral-400 uppercase mb-2 flex items-center gap-2">
                                <Info size={12} /> Observaciones del Operador
                            </p>
                            <p className="text-sm text-neutral-600 italic">"{data.observaciones}"</p>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: Resumen Financiero y Cliente */}
                    <div className="space-y-6">

                        {/* Card del Cliente */}
                        <div className="bg-blue-600 rounded-[2rem] p-6 text-white shadow-lg shadow-blue-200">
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center font-black">
                                    {data.casillero.split('-')[1]}
                                </div>
                                <span className="text-[9px] font-black bg-white/20 px-2 py-1 rounded-md uppercase">Casillero {data.casillero}</span>
                            </div>
                            <p className="text-[10px] font-bold text-blue-100 uppercase">Propietario</p>
                            <h3 className="text-xl font-black">{data.cliente}</h3>
                        </div>

                        {/* Desglose Financiero - LA INFO QUE IMPORTA */}
                        <div className="bg-neutral-900 rounded-[2rem] p-8 text-white shadow-xl">
                            <p className="text-[10px] font-black text-neutral-500 uppercase mb-6 tracking-widest border-b border-neutral-800 pb-3">Liquidación Final</p>

                            <div className="space-y-4">
                                <div className="flex justify-between text-xs">
                                    <span className="text-neutral-500">Flete ({data.peso} lb x ${data.tarifaXLibre}):</span>
                                    <span className="font-bold">${data.peso * data.tarifaXLibre}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-neutral-500">Envío / Entrega:</span>
                                    <span className="font-bold">₡{data.costoEnvioCorreos.toLocaleString()}</span>
                                </div>
                                <div className="pt-4 border-t border-neutral-800">
                                    <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Total a Cobrar Cliente</p>
                                    <p className="text-3xl font-black text-white">₡{calculos.totalPagar.toLocaleString()}</p>
                                </div>
                                <div className="pt-4 mt-4 bg-white/5 p-4 rounded-2xl">
                                    <p className="text-[10px] font-bold text-green-400 uppercase mb-1">Tu Ganancia Real</p>
                                    <p className="text-xl font-black text-green-400">₡{calculos.gananciaTotal.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Info de Facturación */}
                        <div className="bg-neutral-50 p-6 rounded-[2rem] border border-neutral-100">
                            <div className="flex items-center gap-2 mb-4 text-neutral-400">
                                <Hash size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Facturación</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold text-neutral-800">{data.nFactura}</p>
                                    <p className="text-[10px] text-neutral-400">Estado: {data.estadoPago}</p>
                                </div>
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </>
    );
};

export default PackageDetailPage;