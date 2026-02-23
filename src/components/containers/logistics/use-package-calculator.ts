import { useState, useMemo } from 'react';

// Interfaces para mantener el orden
interface PackageFormData {
  tracking: string;
  codigoCliente: string;
  pesoLb: number;
  tipoPaquete: string;
  costoPTY: number;
  observaciones: string;
}

export const usePackageCalculator = () => {
  // Configuración (Luego podrá venir de una API/Contexto)
  const PRECIO_LB_USD = 6;
  const TIPO_CAMBIO = 520;

  const [formData, setFormData] = useState<PackageFormData>({
    tracking: '',
    codigoCliente: '',
    pesoLb: 0,
    tipoPaquete: 'Aéreo',
    costoPTY: 0,
    observaciones: '',
  });

  // Cálculos derivados usando useMemo para eficiencia
  const calculations = useMemo(() => {
    const cobroUSD = formData.pesoLb * PRECIO_LB_USD;
    const cobroCRC = cobroUSD * TIPO_CAMBIO;

    // La ganancia es lo que cobras menos lo que te cuesta (flete/aduana)
    const gananciaEstimada = cobroCRC - formData.costoPTY;

    return {
      precioPorLibra: PRECIO_LB_USD,
      tipoCambio: TIPO_CAMBIO,
      cobroTotalUSD: cobroUSD,
      cobroTotalCRC: cobroCRC,
      gananciaEstimada,
    };
  }, [formData.pesoLb, formData.costoPTY]);

  const updateField = (field: keyof PackageFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    console.log('Datos listos para el CSV Maestro:', {
      ...formData,
      ...calculations,
      fechaRegistro: new Date().toISOString(),
    });
    // Aquí se conectará con el backend/google sheets
  };

  return {
    formData,
    calculations,
    updateField,
    handleSave,
  };
};
