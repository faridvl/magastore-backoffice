import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';

const NuevoPaquetePage: React.FC = () => {
    const [peso, setPeso] = useState(0);
    const [tarifaPorLibra, setTarifaPorLibra] = useState(5.50); // Ejemplo
    const [total, setTotal] = useState(0);

    useEffect(() => {
        // El cálculo se hace solo al cambiar el peso
        setTotal(peso * tarifaPorLibra);
    }, [peso, tarifaPorLibra]);

    return (
        <>
            <Head><title>Nuevo Registro | Magastore</title></Head>
            <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Registrar Paquete">
                <div className="p-6 bg-white rounded-lg shadow">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Formulario de Registro */}
                        <input
                            type="text"
                            placeholder="Tracking Number"
                            className="border p-2 rounded"
                        />
                        <select className="border p-2 rounded">
                            <option>Seleccionar Cliente</option>
                            {/* Mapear clientes registrados */}
                        </select>
                        <input
                            type="number"
                            placeholder="Peso (lb)"
                            onChange={(e) => setPeso(Number(e.target.value))}
                            className="border p-2 rounded"
                        />
                        <div className="bg-blue-50 p-4 rounded">
                            <p className="text-sm text-blue-600">Total a Cobrar:</p>
                            <h2 className="text-2xl font-bold">${total.toFixed(2)}</h2>
                        </div>
                    </div>
                    <button className="mt-4 bg-blue-600 text-white px-6 py-2 rounded">
                        Guardar Pedido
                    </button>
                </div>
            </DashboardLayout>
        </>
    );
};

// export const getServerSideProps = authorizeServerSidePage();
export default NuevoPaquetePage;