import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CustomerImportRow, CustomerImportResult } from '@/types/customer/customer.types';
import { useImportCustomersMutation } from '@/shared/api/mutations/use-import-customers-mutation';
import { IdType } from '@/types/customer/customer.types';
import { resolveLocation } from '@/shared/constants/costa-rica-locations';

const VALID_ID_TYPES: IdType[] = ['FISICA', 'JURIDICA', 'DIMEX', 'PASAPORTE'];

export const useImportCustomers = (onClose: () => void) => {
  const queryClient = useQueryClient();
  const [parsedRows, setParsedRows] = useState<CustomerImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<CustomerImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const { mutate, isPending } = useImportCustomersMutation();

  const parseFile = useCallback((file: File) => {
    setParseError(null);
    setParsedRows([]);
    setResult(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

        if (raw.length === 0) {
          setParseError('El archivo está vacío o no tiene filas de datos.');
          return;
        }

        const rows: CustomerImportRow[] = [];
        const rowErrors: string[] = [];

        raw.forEach((r, i) => {
          const rowNum = i + 2;
          const idCard = r['cedula']?.toString().trim();
          const idTypeRaw = r['tipo_identificacion']?.toString().trim().toUpperCase() as IdType;
          const firstName = r['nombre']?.toString().trim();
          const lastName = r['apellidos']?.toString().trim();
          const email = r['email']?.toString().trim();
          const phone = r['telefono']?.toString().trim();
          const province = r['provincia']?.toString().trim();
          const canton = r['canton']?.toString().trim();
          const district = r['distrito']?.toString().trim();
          const exactAddress = r['direccion_exacta']?.toString().trim();
          const addressLabel = r['etiqueta']?.toString().trim() || 'Casa';
          const isPrincipalRaw = r['es_principal']?.toString().trim().toLowerCase();
          const isDefault = isPrincipalRaw === 'si' || isPrincipalRaw === 'sí' || isPrincipalRaw === 'yes' || isPrincipalRaw === '1';
          const customerCode = r['codigo_magastore']?.toString().trim() || undefined;

          if (!idCard) { rowErrors.push(`Fila ${rowNum}: cédula vacía.`); return; }
          if (!VALID_ID_TYPES.includes(idTypeRaw)) { rowErrors.push(`Fila ${rowNum}: tipo_identificacion inválido "${idTypeRaw}". Valores válidos: ${VALID_ID_TYPES.join(', ')}.`); return; }
          if (!firstName) { rowErrors.push(`Fila ${rowNum}: nombre vacío.`); return; }
          if (!lastName) { rowErrors.push(`Fila ${rowNum}: apellidos vacíos.`); return; }
          if (!email) { rowErrors.push(`Fila ${rowNum}: email vacío.`); return; }
          if (!phone) { rowErrors.push(`Fila ${rowNum}: teléfono vacío.`); return; }
          if (!province || !canton || !district || !exactAddress) { rowErrors.push(`Fila ${rowNum}: campos de dirección incompletos.`); return; }

          const resolvedLocation = resolveLocation(province, canton, district);
          if (!resolvedLocation) {
            rowErrors.push(`Fila ${rowNum}: la combinación provincia/cantón/distrito "${province} / ${canton} / ${district}" no coincide con la división territorial de Costa Rica.`);
            return;
          }

          rows.push({
            id_card: idCard,
            id_type: idTypeRaw,
            first_name: firstName,
            last_name: lastName,
            email,
            phone,
            customer_code: customerCode || undefined,
            province: resolvedLocation.province,
            canton: resolvedLocation.canton,
            district: resolvedLocation.district,
            exact_address: exactAddress,
            address_label: addressLabel,
            is_default: isDefault,
          });
        });

        if (rowErrors.length > 0) {
          setParseError(rowErrors.join('\n'));
          return;
        }

        setParsedRows(rows);
      } catch {
        setParseError('No se pudo leer el archivo. Asegúrate de subir un .xlsx o .xls válido.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleImport = useCallback(() => {
    if (parsedRows.length === 0) return;

    mutate(parsedRows, {
      onSuccess: (res) => {
        const { inserted, errors } = res.data;
        setResult({ inserted, errors });
        queryClient.invalidateQueries({ queryKey: ['customers'] });

        if (errors.length === 0) {
          toast.success(`${inserted} cliente${inserted !== 1 ? 's' : ''} importado${inserted !== 1 ? 's' : ''} correctamente.`);
        } else {
          toast.success(`${inserted} importado${inserted !== 1 ? 's' : ''}, ${errors.length} con error${errors.length !== 1 ? 'es' : ''}.`);
        }
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Error al importar clientes.';
        toast.error(msg);
      },
    });
  }, [parsedRows, mutate, queryClient]);

  const handleClose = useCallback(() => {
    setParsedRows([]);
    setParseError(null);
    setResult(null);
    setFileName(null);
    onClose();
  }, [onClose]);

  const downloadTemplate = useCallback(() => {
    const headers = [
      'cedula', 'tipo_identificacion', 'nombre', 'apellidos', 'email', 'telefono',
      'codigo_magastore', 'provincia', 'canton', 'distrito', 'direccion_exacta', 'etiqueta', 'es_principal',
    ];
    const example = [
      '123456789', 'FISICA', 'Juan', 'Pérez González', 'juan@email.com', '88881234',
      '', 'San José', 'Central', 'Carmen', 'Casa 123 frente al parque', 'Casa', 'Si',
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'template_importacion_clientes.xlsx');
  }, []);

  const uniqueCustomers = new Map<string, CustomerImportRow>();
  for (const r of parsedRows) uniqueCustomers.set(r.id_card, r);

  return {
    parsedRows,
    uniqueCustomerCount: uniqueCustomers.size,
    parseError,
    result,
    fileName,
    isPending,
    parseFile,
    handleImport,
    handleClose,
    downloadTemplate,
  };
};
