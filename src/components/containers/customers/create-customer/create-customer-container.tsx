import React from 'react';
import { ChevronDown, MapPin, Plus } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { LocationSelectFields } from '@/components/common/location-select-fields/location-select-fields';
import { Badge } from '@/components/common/badge/badge';
import { EmptyState } from '@/components/common/empty-state/empty-state';
import { BadgeTone } from '@/shared/constants/status-labels';
import { packageTypeLabel } from '@/shared/constants/package-labels';
import { ID_TYPE_OPTIONS, idCardPlaceholder } from '@/shared/utils/customer-masks';
import { useCreateCustomer } from './use-create-customer';

const LOCATION_SELECT_CLASSNAME = 'w-full min-h-[44px] bg-slate-50 border border-transparent rounded-[16px] md:rounded-[20px] px-4 py-3.5 md:px-6 md:py-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-slate-700 shadow-sm text-base disabled:opacity-50 disabled:cursor-not-allowed';
const LOCATION_LABEL_CLASSNAME = 'text-sm font-semibold text-slate-700 ml-1';

const ADDRESS_LABELS = ['Casa', 'Oficina', 'Casa de familiar', 'Otro'];
const PRINCIPAL_ADDRESS_LABEL = 'principal';

const BILLING_MODE_DESC = (mode: string, discount: number): string => {
    if (mode === 'AL_COSTO') return 'Paga solo el costo, sin ganancia';
    if (mode === 'DESCUENTO') return `Paga la tarifa por libra con ${discount}% de rebaja`;
    return 'Paga la tarifa completa por libra';
};

export const CreateCustomerContainer: React.FC = () => {
    const {
        register, fieldErrors, sectionErrors, idType, idCard, phone,
        handleIdCardChange, handleIdTypeChange, handlePhoneChange,
        customerTypeId, setCustomerTypeId,
        addresses, customerTypes,
        addAddressField, removeAddress, handleAddressChange, handleSubmit, isPending,
        courierRates, selectedRateUuids, codesByRate, codeErrors, toggleCourierRoute, setCourierCode,
        cancel,
    } = useCreateCustomer();

    return (
        <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-10 bg-white p-4 md:p-12 rounded-[24px] md:rounded-[40px] border border-slate-100 shadow-xl shadow-slate-100/50 mb-20">

                {/* SECCIÓN 1: DATOS PERSONALES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput label="Nombre" placeholder="Ej. María" error={fieldErrors.first_name?.message} {...register('first_name')} />
                    <FormInput label="Apellidos" placeholder="Ej. Rodríguez Mora" error={fieldErrors.last_name?.message} {...register('last_name')} />

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 ml-1">Tipo de identificación</label>
                        <div className="relative">
                            <select
                                value={idType}
                                onChange={(e) => handleIdTypeChange(e.target.value)}
                                className="w-full min-h-[44px] bg-white border border-slate-200 rounded-[16px] md:rounded-[20px] pl-4 pr-12 py-3.5 md:pl-6 md:py-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-slate-700 shadow-sm appearance-none text-base"
                            >
                                {ID_TYPE_OPTIONS.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={18} aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 md:right-6" />
                        </div>
                    </div>

                    {/* Cédula y teléfono no usan register directo: el valor pasa por la
                        máscara antes de entrar al formulario, y el formato depende del
                        tipo de identificación elegido. */}
                    <FormInput
                        label="Número de cédula"
                        value={idCard}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIdCardChange(e.target.value)}
                        placeholder={idCardPlaceholder(idType)}
                        inputMode={idType === 'PASAPORTE' ? 'text' : 'numeric'}
                        error={fieldErrors.id_card?.message}
                    />
                    <FormInput label="Correo electrónico" type="email" inputMode="email" placeholder="cliente@email.com" error={fieldErrors.email?.message} {...register('email')} />
                    <FormInput
                        label="Teléfono"
                        value={phone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePhoneChange(e.target.value)}
                        placeholder="+506 0000-0000"
                        inputMode="tel"
                        error={fieldErrors.phone?.message}
                    />
                </div>

                {/* SECCIÓN 1B: CASILLEROS (couriers con los que va a operar) */}
                <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-4 mb-2">
                        <Typography variant={TypographyVariant.SUBTITLE}>Casilleros</Typography>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                            Se crea un código por cada courier que marques.
                        </p>
                        {sectionErrors.warehouses && (
                            <p className="text-sm text-red-600 font-semibold mt-2">{sectionErrors.warehouses}</p>
                        )}
                    </div>

                    {courierRates.length === 0 ? (
                        <p className="text-sm font-medium text-red-600">
                            No hay couriers activos. Configura uno en Couriers antes de registrar clientes.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-3">
                            {courierRates.map((rate) => {
                                // La selección va por uuid de la tarifa: warehouse_route_id es
                                // único por (origin, package_type), así que dos couriers del
                                // mismo origen y tipo lo comparten y marcaban ambas tarjetas.
                                const routeId = rate.warehouse_route_id;
                                const isSelected = selectedRateUuids.includes(rate.uuid);
                                const nextCode = rate.code_prefix
                                    ? `${rate.code_prefix}${String((rate.current_counter ?? 0) + 1).padStart(2, '0')}`
                                    : null;
                                return (
                                    <div
                                        key={rate.uuid}
                                        className={`rounded-3xl border-2 transition-all ${isSelected ? 'border-amber-600 bg-amber-50/30 shadow-md' : 'border-slate-50 bg-slate-50/50'} ${!routeId ? 'opacity-40' : ''}`}
                                    >
                                        <button
                                            type="button"
                                            // Un courier sin casillero configurado no puede generar códigos.
                                            disabled={!routeId}
                                            onClick={() => routeId && toggleCourierRoute(rate.uuid)}
                                            className="w-full min-h-[44px] text-left p-5 flex items-start gap-3 disabled:cursor-not-allowed"
                                        >
                                            <span className={`mt-0.5 w-4 h-4 rounded-md border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-amber-600 border-amber-600' : 'border-slate-300'}`}>
                                                {isSelected && <span className="text-white text-[10px] font-black leading-none">✓</span>}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-sm font-bold text-slate-700 break-words">{rate.name}</span>
                                                <span className="block text-xs font-medium text-slate-500 mt-0.5">
                                                    {rate.origin} · {packageTypeLabel(rate.package_type)}
                                                    {!routeId && ' · sin casillero configurado'}
                                                </span>
                                            </span>
                                        </button>

                                        {/* El código manual pertenece a ESTE courier. Antes era un
                                            campo suelto que el backend pegaba siempre al primer
                                            casillero marcado, sin decirlo en ninguna parte. */}
                                        {isSelected && (
                                            <div className="px-5 pb-5 -mt-1 space-y-1.5">
                                                <label className="text-sm font-semibold text-slate-700">
                                                    Código (opcional)
                                                </label>
                                                <input
                                                    value={codesByRate[rate.uuid] ?? ''}
                                                    onChange={(e) => setCourierCode(rate.uuid, e.target.value)}
                                                    placeholder={nextCode ? `Se asignará ${nextCode}` : 'Se genera automáticamente'}
                                                    className={`w-full min-h-[44px] bg-white border rounded-2xl px-4 py-3 text-base font-mono font-bold text-slate-700 placeholder:font-sans placeholder:font-medium placeholder:text-slate-400 outline-none transition-all ${
                                                        codeErrors[rate.uuid]
                                                            ? 'border-red-300 bg-red-50/40 focus:ring-2 focus:ring-red-400'
                                                            : 'border-amber-100 focus:ring-2 focus:ring-amber-500'
                                                    }`}
                                                />
                                                {/* Formato incorrecto se avisa al momento, no al enviar. */}
                                                {codeErrors[rate.uuid] ? (
                                                    <p className="text-xs font-bold text-red-600">{codeErrors[rate.uuid]}</p>
                                                ) : rate.code_prefix ? (
                                                    <p className="text-xs font-medium text-slate-500">Déjalo vacío y se asigna solo.</p>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* SECCIÓN 2: TIPO DE CLIENTE (regla de cobro). "Regular" llega marcado: es el tipo
                    que el servidor aplica cuando no se elige ninguno. */}
                <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-4 mb-2">
                        <Typography variant={TypographyVariant.SUBTITLE}>Tipo de cliente</Typography>
                        <p className="text-sm font-medium text-slate-500 mt-1">Define cuánto paga por libra.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {customerTypes.map((type) => {
                            const isSelected = String(type.id) === customerTypeId;
                            return (
                                <button
                                    type="button"
                                    key={type.id}
                                    onClick={() => setCustomerTypeId(String(type.id))}
                                    className={`text-left cursor-pointer p-5 rounded-3xl border-2 transition-all ${isSelected ? 'border-amber-600 bg-amber-50/30 shadow-md' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'border-amber-600' : 'border-slate-300'}`}>
                                            {isSelected && <span className="w-2 h-2 rounded-full bg-amber-600" />}
                                        </span>
                                        <span className="text-sm font-bold text-slate-700 break-words min-w-0">{type.name}</span>
                                    </span>
                                    <span className="block text-xs font-medium text-slate-500 mt-1.5 ml-6">
                                        {BILLING_MODE_DESC(type.billing_mode, Number(type.discount_percent))}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* SECCIÓN 3: DIRECCIONES */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center gap-3 border-b border-slate-100 pb-4">
                        <div className="min-w-0">
                            <Typography variant={TypographyVariant.SUBTITLE}>Direcciones de entrega</Typography>
                            {sectionErrors.addresses && (
                                <p className="text-sm text-red-600 font-semibold mt-1">{sectionErrors.addresses}</p>
                            )}
                        </div>
                        {addresses.length > 0 && (
                            <button type="button" onClick={addAddressField} className="flex items-center gap-1 text-sm font-bold text-amber-700 bg-amber-50 px-4 md:px-6 min-h-[44px] rounded-2xl hover:bg-amber-100 transition-all flex-shrink-0 whitespace-nowrap">
                                <Plus size={14} /> Agregar
                            </button>
                        )}
                    </div>

                    {addresses.length === 0 && (
                        <div className="bg-slate-50/50 rounded-[24px] md:rounded-[32px] border border-dashed border-slate-200">
                            <EmptyState
                                title="Aún no hay direcciones"
                                actionLabel="Agregar dirección"
                                onAction={addAddressField}
                                className="py-8"
                            />
                        </div>
                    )}

                    {addresses.map((addr) => {
                        // Si la etiqueta ya dice "Principal" el badge repetiría lo mismo.
                        const showDefaultBadge = addr.is_default && addr.address_label.trim().toLowerCase() !== PRINCIPAL_ADDRESS_LABEL;
                        return (
                            <div key={addr.id} className="p-5 md:p-8 bg-slate-50/50 rounded-[24px] md:rounded-[32px] border border-slate-100 relative">
                                <div className="flex justify-between items-center gap-3 mb-6">
                                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                                        <MapPin size={16} className="text-amber-600 flex-shrink-0" />
                                        <span className="text-sm font-bold text-slate-800 break-words">{addr.address_label}</span>
                                        {showDefaultBadge && <Badge tone={BadgeTone.NEUTRAL}>Principal</Badge>}
                                    </div>
                                    <button type="button" onClick={() => removeAddress(addr.id)} className="min-h-[44px] px-3 text-red-600 hover:text-red-700 text-sm font-semibold flex-shrink-0">Eliminar</button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <LocationSelectFields
                                        province={addr.province}
                                        canton={addr.canton}
                                        district={addr.district}
                                        onChange={(field, value) => handleAddressChange(addr.id, field, value)}
                                        selectClassName={LOCATION_SELECT_CLASSNAME}
                                        labelClassName={LOCATION_LABEL_CLASSNAME}
                                    />
                                    <div className="col-span-1 md:col-span-2">
                                        <FormInput label="Dirección exacta" value={addr.exact_address} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAddressChange(addr.id, 'exact_address', e.target.value)} placeholder="Detalles de la ubicación..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 ml-1">Etiqueta</label>
                                        <select
                                            value={addr.address_label}
                                            onChange={(e) => handleAddressChange(addr.id, 'address_label', e.target.value)}
                                            className="w-full min-h-[44px] bg-white border border-slate-200 rounded-[16px] md:rounded-[20px] px-4 py-3.5 md:px-6 md:py-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-slate-700 shadow-sm text-base"
                                        >
                                            {(addr.address_label && !ADDRESS_LABELS.includes(addr.address_label) ? [...ADDRESS_LABELS, addr.address_label] : ADDRESS_LABELS).map((l) => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleAddressChange(addr.id, 'is_default', !addr.is_default)}
                                    aria-pressed={addr.is_default}
                                    className="mt-3 flex items-center gap-3 min-h-[44px]"
                                >
                                    <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${addr.is_default ? 'bg-amber-500' : 'bg-slate-300'}`}>
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${addr.is_default ? 'translate-x-4' : 'translate-x-1'}`} />
                                    </span>
                                    <span className="text-sm font-semibold text-slate-600">Marcar como dirección principal</span>
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* ACCIONES */}
                <div className="flex gap-4 pt-6 md:pt-10 border-t border-slate-50">
                    {/* Antes no tenía handler: se veía como botón pero no hacía nada. */}
                    <button type="button" onClick={cancel} disabled={isPending} className="flex-1 min-h-[44px] py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all disabled:opacity-50">Cancelar</button>
                    <button type="submit" disabled={isPending} className="flex-[2] min-h-[44px] py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-lg shadow-slate-300 disabled:opacity-60 disabled:cursor-not-allowed">
                        {isPending ? 'Guardando...' : 'Registrar cliente'}
                    </button>
                </div>
            </form>
        </div>
    );
};

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

// forwardRef: react-hook-form registra los campos por ref, y sin esto los que
// usan {...register(...)} quedarían fuera del formulario.
const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
    ({ label, error, ...props }, ref) => (
        <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">{label}</label>
            <input
                ref={ref}
                {...props}
                className={`w-full min-h-[44px] bg-white border rounded-[16px] md:rounded-[20px] px-4 py-3.5 md:px-6 md:py-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400 shadow-sm text-base ${error ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}
            />
            {error && <p className="text-sm text-red-600 font-semibold ml-2">{error}</p>}
        </div>
    ),
);
FormInput.displayName = 'FormInput';
