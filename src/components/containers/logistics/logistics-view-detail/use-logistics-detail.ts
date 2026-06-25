import { usePackageDetailQuery } from '@/shared/api/querys/logistics/find-one-package-query';
import { useState, useEffect, useMemo } from 'react';

export const usePackageDetailContainer = (uuid?: string) => {
  const [isEditingFinancial, setIsEditingFinancial] = useState(false);

  // Hook de Query estándar
  const packageQuery = usePackageDetailQuery(uuid as string);
  const { data: apiData, isLoading, isError } = packageQuery.useQuery();

  const [data, setData] = useState({
    tracking: 'Cargando...',
    peso: 0,
    estadoPaquete: '---',
    observaciones: '',
    // Datos que no vienen en el API (Mockeados para la vista)
    tienda: 'Amazon', // [BACKEND MISSING]: Retornar tienda de origen
    cliente: 'Cliente del Sistema', // [BACKEND MISSING]: Retornar nombre del dueño
    casillero: 'S-000', // [BACKEND MISSING]: Retornar número de casillero
    numPedido: 'N/A',
    // Configuración financiera local
    tarifaXLibre: 6,
    tipoCambio: 540,
    costoEnvioCorreos: 2500,
    costoPTY: 0,
    estadoPago: 'PENDIENTE',
  });

  // Sincronización manual del estado local con la respuesta del API
  useEffect(() => {
    if (apiData) {
      // Nota: Si tu API devuelve { result: { ... } }, cambia apiData por apiData.result
      const source = apiData;

      setData((prev) => ({
        ...prev,
        tracking: source.tracking_number || prev.tracking,
        peso: source.weight_lb ? parseFloat(source.weight_lb) : prev.peso,
        estadoPaquete: source.status || prev.estadoPaquete,
        observaciones: source.internal_notes || 'Sin notas internas.',
        id: source.uuid,
      }));
    }
  }, [apiData]);

  // Formateo de la bitácora de eventos
  const bitacora = useMemo(() => {
    if (!apiData?.events) return [];
    return apiData.events.map((e: any) => ({
      id: e.id,
      fecha: new Date(e.created_at).toLocaleString('es-CR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      estado: e.status,
      nota: e.description,
      user: 'Sist.',
      location: e.location || 'No especificada',
    }));
  }, [apiData]);

  // Cálculos automáticos basados en el estado 'data'
  const calculos = useMemo(() => {
    const pesoNum = Number(data.peso) || 0;
    const fleteUSD = pesoNum * data.tarifaXLibre;
    const totalPagar = fleteUSD * data.tipoCambio + data.costoEnvioCorreos;

    return {
      fleteUSD,
      totalPagar,
      gananciaTotal: totalPagar - data.costoPTY,
    };
  }, [data.peso, data.tarifaXLibre, data.tipoCambio, data.costoEnvioCorreos, data.costoPTY]);

  const updateField = (field: string, value: any) =>
    setData((prev) => ({ ...prev, [field]: value }));

  const handleSaveFinancial = () => {
    // Aquí iría la mutación para actualizar el peso en el server
    setIsEditingFinancial(false);
  };

  return {
    data,
    bitacora,
    calculos,
    isLoading,
    isError,
    isEditingFinancial,
    setIsEditingFinancial,
    handleSaveFinancial,
    updateField,
  };
};
