import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { toast } from 'sonner';
import { useCreateCustomerMutation } from '@/shared/api/mutations/customers/use-create-customer-mutation';
import { useCustomerTypesQuery } from '@/shared/api/querys/customers/use-customer-types-query';
import { useCourierRatesQuery } from '@/shared/api/querys/logistics/use-courier-rates-query';
import { useNavigation } from '@/hooks/use-navigation';
import {
  applyIdMask,
  applyPhoneMask,
  applyWarehouseCodeMask,
  validateWarehouseCode,
} from '@/shared/utils/customer-masks';
import { customerIdentitySchema, CustomerIdentityForm } from '@/shared/utils/customer-schema';

/**
 * Alta de cliente. Los datos identificatorios los maneja react-hook-form con
 * validación Yup; direcciones y casilleros viven en estado propio porque son
 * listas dinámicas con reglas cruzadas (una sola principal, un código por
 * courier) que no encajan en el esquema plano del formulario.
 */
export const useCreateCustomer = () => {
  const { admin } = useNavigation();
  const { execute, isPending } = useCreateCustomerMutation();
  const { data: customerTypesRes } = useCustomerTypesQuery();
  const customerTypes = (customerTypesRes?.data ?? []).filter((t) => t.is_active);
  const { data: courierRatesRes } = useCourierRatesQuery();
  const courierRates = useMemo(
    () => (Array.isArray(courierRatesRes) ? courierRatesRes : []),
    [courierRatesRes],
  );

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors: fieldErrors },
    watch,
    setValue,
  } = useForm<CustomerIdentityForm>({
    resolver: yupResolver(customerIdentitySchema),
    // onTouched: no se grita el error mientras el operador todavía escribe el
    // campo por primera vez, pero sí en cuanto lo abandona.
    mode: 'onTouched',
    defaultValues: {
      first_name: '',
      last_name: '',
      id_type: 'FISICA',
      id_card: '',
      email: '',
      phone: '',
    },
  });

  const idType = watch('id_type');
  const [customerTypeId, setCustomerTypeId] = useState('');

  const [addresses, setAddresses] = useState([
    {
      id: crypto.randomUUID(),
      province: '',
      canton: '',
      district: '',
      exact_address: '',
      address_label: 'Principal',
      is_default: true,
    },
  ]);

  // Errores de las secciones que no gestiona react-hook-form.
  const [sectionErrors, setSectionErrors] = useState<{ addresses?: string; warehouses?: string }>({});

  // Couriers con los que el cliente va a operar: uno por casillero. Se
  // identifican por uuid de la tarifa — dos proveedores distintos pueden
  // compartir origen y tipo de paquete, así que la ruta no los distingue.
  const [selectedRateUuids, setSelectedRateUuids] = useState<string[]>([]);
  const [routesTouched, setRoutesTouched] = useState(false);

  // Código de casillero manual por courier (uuid → código). Vacío = el backend
  // genera el siguiente de esa ruta.
  const [codesByRate, setCodesByRate] = useState<Record<string, string>>({});

  useEffect(() => {
    if (routesTouched || courierRates.length === 0) return;
    const preselected = courierRates.find((r) => r.is_default) ?? courierRates[0];
    if (preselected?.warehouse_route_id) setSelectedRateUuids([preselected.uuid]);
  }, [courierRates, routesTouched]);

  const toggleCourierRoute = (rateUuid: string) => {
    setRoutesTouched(true);
    const isRemoving = selectedRateUuids.includes(rateUuid);

    setSelectedRateUuids((prev) =>
      prev.includes(rateUuid) ? prev.filter((u) => u !== rateUuid) : [...prev, rateUuid],
    );

    // Al desmarcar se descarta el código escrito: dejarlo colgando haría que
    // reapareciera con un valor viejo si el operador vuelve a marcar el courier.
    if (isRemoving) {
      setCodesByRate((codes) => {
        const { [rateUuid]: _discarded, ...rest } = codes;
        return rest;
      });
    }
    setSectionErrors((prev) => ({ ...prev, warehouses: undefined }));
  };

  const setCourierCode = (rateUuid: string, code: string) => {
    setCodesByRate((prev) => ({ ...prev, [rateUuid]: applyWarehouseCodeMask(code) }));
  };

  /**
   * Error de formato por courier, en vivo. Se valida contra el prefijo de la
   * ruta de ESE courier: un código de CPF no puede llevar el prefijo de Aéreo
   * USA aunque ambos sean USA/AEREO.
   */
  const codeErrors = useMemo(() => {
    const result: Record<string, string> = {};
    for (const rate of courierRates) {
      const code = codesByRate[rate.uuid];
      if (!code) continue;
      const error = validateWarehouseCode(code, rate.code_prefix);
      if (error) result[rate.uuid] = error;
    }
    return result;
  }, [courierRates, codesByRate]);

  // Tarifas marcadas, ya filtradas a las que tienen casillero configurado: sin
  // warehouse_route_id el backend no puede generar código.
  const selectedRates = useMemo(
    () => courierRates.filter((r) => selectedRateUuids.includes(r.uuid) && !!r.warehouse_route_id),
    [courierRates, selectedRateUuids],
  );

  /** Máscara de cédula: depende del tipo, así que se aplica al vuelo. */
  const handleIdCardChange = (value: string) => {
    setValue('id_card', applyIdMask(value, idType), { shouldValidate: false });
  };

  const handleIdTypeChange = (value: string) => {
    // Cambiar el tipo invalida el número ya escrito: su formato era otro.
    setValue('id_type', value as CustomerIdentityForm['id_type']);
    setValue('id_card', '');
  };

  const handlePhoneChange = (value: string) => {
    setValue('phone', applyPhoneMask(value), { shouldValidate: false });
  };

  const addAddressField = () => {
    setAddresses((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        province: '',
        canton: '',
        district: '',
        exact_address: '',
        address_label: 'Casa',
        is_default: false,
      },
    ]);
    setSectionErrors((prev) => ({ ...prev, addresses: undefined }));
  };

  const removeAddress = (id: string) => {
    if (addresses.length > 1) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleAddressChange = (id: string, field: string, value: string | boolean) => {
    setAddresses((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          if (field === 'province') return { ...a, province: value as string, canton: '', district: '' };
          if (field === 'canton') return { ...a, canton: value as string, district: '' };
          return { ...a, [field]: value };
        }
        if (field === 'is_default' && value === true) return { ...a, is_default: false };
        return a;
      })
    );
  };

  /**
   * Valida lo que el esquema Yup no cubre: las listas dinámicas. Corre después
   * de que react-hook-form aprueba los campos identificatorios.
   */
  const validateSections = (): boolean => {
    const next: { addresses?: string; warehouses?: string } = {};

    const incomplete = addresses.some(
      (a) => !a.province || !a.canton || !a.district || !a.exact_address.trim(),
    );
    if (addresses.length === 0) {
      next.addresses = 'Debes agregar al menos una dirección de entrega';
    } else if (incomplete) {
      next.addresses = 'Completa provincia, cantón, distrito y dirección exacta en todas las direcciones';
    }

    // Sin casillero el cliente no puede recibir paquetes de ningún courier. El
    // backend caería al predeterminado en silencio, que rara vez es lo que el
    // operador quiso si desmarcó todo a propósito.
    if (selectedRates.length === 0) {
      next.warehouses = 'Selecciona al menos un courier para generarle casillero';
    }

    // Dos casilleros del mismo cliente no pueden compartir código. El backend
    // también lo valida, pero avisar antes evita perder el formulario lleno.
    const manualCodes = selectedRates
      .map((r) => codesByRate[r.uuid]?.trim())
      .filter((c): c is string => !!c);
    if (new Set(manualCodes).size !== manualCodes.length) {
      next.warehouses = 'Hay dos casilleros con el mismo código manual';
    }

    // Un código con formato inválido se rechazaría en el backend o, peor, se
    // guardaría tal cual y quedaría un casillero que no sigue la numeración.
    const invalid = selectedRates.filter((r) => codeErrors[r.uuid]);
    if (invalid.length > 0) {
      next.warehouses = `Revisa el código de ${invalid.map((r) => r.name).join(', ')}: el formato no es válido.`;
    }

    setSectionErrors(next);
    return Object.keys(next).length === 0;
  };

  const onValid = (values: CustomerIdentityForm) => {
    if (!validateSections()) {
      toast.error('Revisa los campos marcados antes de guardar.');
      return;
    }

    const payload = {
      id_card: values.id_card,
      id_type: values.id_type,
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      phone: values.phone,
      // Vacío = el backend asigna el tipo NORMAL por defecto.
      customer_type_id: customerTypeId ? Number(customerTypeId) : null,
      // Un casillero por courier marcado, cada uno con su código opcional.
      warehouse_codes: selectedRates.map((rate) => ({
        warehouse_route_id: rate.warehouse_route_id as number,
        code: codesByRate[rate.uuid]?.trim() || null,
      })),
      addresses: addresses.map(({ id, ...rest }) => rest),
    };

    execute(payload, {
      onSuccess: () => {
        toast.success('Cliente registrado exitosamente');
        admin.customers.list();
      },
      onError: (err: any) => {
        // El backend manda la causa exacta (dirección inválida, cédula/correo
        // duplicado, etc.) — mostrarla en vez de un genérico que apunta solo
        // a correo/cédula cuando la falla puede ser otra.
        toast.error(err?.message ?? 'No se pudo registrar el cliente. Verifica que el correo y la cédula no estén ya registrados.');
      },
    });
  };

  const handleSubmit = rhfHandleSubmit(onValid, () => {
    validateSections();
    toast.error('Revisa los campos marcados antes de guardar.');
  });

  return {
    register,
    fieldErrors,
    sectionErrors,
    idType,
    idCard: watch('id_card'),
    phone: watch('phone'),
    handleIdCardChange,
    handleIdTypeChange,
    handlePhoneChange,
    customerTypeId,
    setCustomerTypeId,
    addresses,
    customerTypes,
    courierRates,
    selectedRateUuids,
    codesByRate,
    codeErrors,
    toggleCourierRoute,
    setCourierCode,
    addAddressField,
    removeAddress,
    handleAddressChange,
    handleSubmit,
    isPending,
    cancel: () => admin.customers.list(),
  };
};
