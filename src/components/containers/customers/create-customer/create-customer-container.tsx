import React from 'react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { LocationSelectFields } from '@/components/common/location-select-fields/location-select-fields';
import { ID_TYPE_OPTIONS, idCardPlaceholder } from '@/shared/utils/customer-masks';
import { useCreateCustomer } from './use-create-customer';

const LOCATION_SELECT_CLASSNAME = 'w-full bg-slate-50 border border-transparent rounded-[16px] md:rounded-[20px] px-4 py-3.5 md:px-6 md:py-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-slate-700 shadow-sm text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed';
const LOCATION_LABEL_CLASSNAME = 'text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest';

const ADDRESS_LABELS = ['Casa', 'Oficina', 'Casa de familiar', 'Otro'];

const BILLING_MODE_STYLES: Record<string, string> = {
    NORMAL: 'bg-slate-100 text-slate-500',
    AL_COSTO: 'bg-sky-50 text-sky-600',
    DESCUENTO: 'bg-amber-50 text-amber-600',
};

const BILLING_MODE_DESC = (mode: string, discount: number): string => {
    if (mode === 'AL_COSTO') return 'Solo paga lo que costó traer el paquete, sin ganancia';
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
                    <div className="col-span-1 md:col-span-2 border-b border-slate-100 pb-4 mb-2">
                        <Typography variant={TypographyVariant.SUBTITLE}>Nuevo Cliente</Typography>
                        {/* El servicio normaliza al guardar: avisarlo evita que parezca
                            que el sistema "cambió" lo que el operador escribió. */}
                        <p className="text-xs font-medium text-slate-400 mt-1">
                            Nombre, apellidos, cédula y direcciones se guardan en mayúsculas. El correo, en minúsculas.
                        </p>
                    </div>

                    <FormInput label="Nombre" placeholder="Ej. Alexander" error={fieldErrors.first_name?.message} {...register('first_name')} />
                    <FormInput label="Apellidos" placeholder="Ej. Pierce" error={fieldErrors.last_name?.message} {...register('last_name')} />

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Tipo Identificación</label>
                        <select
                            value={idType}
                            onChange={(e) => handleIdTypeChange(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-[16px] md:rounded-[20px] px-4 py-3.5 md:px-6 md:py-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-slate-700 shadow-sm appearance-none text-sm md:text-base"
                        >
                            {ID_TYPE_OPTIONS.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Cédula y teléfono no usan register directo: el valor pasa por la
                        máscara antes de entrar al formulario, y el formato depende del
                        tipo de identificación elegido. */}
                    <FormInput
                        label="Número de Cédula"
                        value={idCard}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIdCardChange(e.target.value)}
                        placeholder={idCardPlaceholder(idType)}
                        inputMode={idType === 'PASAPORTE' ? 'text' : 'numeric'}
                        error={fieldErrors.id_card?.message}
                    />
                    <FormInput label="Correo Electrónico" type="email" inputMode="email" placeholder="cliente@email.com" error={fieldErrors.email?.message} {...register('email')} />
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
                        <p className="text-xs font-medium text-slate-400 mt-1">
                            Se le genera un código por cada courier que marques. Solo podrá recibir paquetes de los couriers seleccionados.
                        </p>
                        {sectionErrors.warehouses && (
                            <p className="text-xs text-red-500 font-semibold mt-2">{sectionErrors.warehouses}</p>
                        )}
                    </div>

                    {courierRates.length === 0 ? (
                        <p className="text-xs font-medium text-red-500">
                            No hay couriers activos. Configura uno en Couriers y Casilleros antes de registrar clientes.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                            className="w-full text-left p-5 flex items-start gap-3 disabled:cursor-not-allowed"
                                        >
                                            <span className={`mt-0.5 w-4 h-4 rounded-md border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-amber-600 border-amber-600' : 'border-slate-300'}`}>
                                                {isSelected && <span className="text-white text-[10px] font-black leading-none">✓</span>}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-sm font-bold text-slate-700 truncate">{rate.name}</span>
                                                <span className="block text-[11px] font-medium text-slate-400 mt-0.5">
                                                    {rate.origin} · {rate.package_type}
                                                    {!routeId && ' · sin casillero configurado'}
                                                </span>
                                            </span>
                                        </button>

                                        {/* El código manual pertenece a ESTE courier. Antes era un
                                            campo suelto que el backend pegaba siempre al primer
                                            casillero marcado, sin decirlo en ninguna parte. */}
                                        {isSelected && (
                                            <div className="px-5 pb-5 -mt-1 space-y-1.5">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                                    Código (opcional)
                                                </label>
                                                <input
                                                    value={codesByRate[rate.uuid] ?? ''}
                                                    onChange={(e) => setCourierCode(rate.uuid, e.target.value)}
                                                    placeholder={nextCode ? `Se asignará ${nextCode}` : 'Se genera automáticamente'}
                                                    className={`w-full bg-white border rounded-2xl px-4 py-3 text-sm font-mono font-bold text-slate-700 placeholder:font-sans placeholder:font-medium placeholder:text-slate-300 outline-none transition-all ${
                                                        codeErrors[rate.uuid]
                                                            ? 'border-red-300 bg-red-50/40 focus:ring-2 focus:ring-red-400'
                                                            : 'border-amber-100 focus:ring-2 focus:ring-amber-500'
                                                    }`}
                                                />
                                                {/* Formato incorrecto se avisa al momento, no al enviar. */}
                                                {codeErrors[rate.uuid] ? (
                                                    <p className="text-[10px] font-bold text-red-500">{codeErrors[rate.uuid]}</p>
                                                ) : rate.code_prefix ? (
                                                    <p className="text-[10px] font-medium text-slate-400">
                                                        Formato: <span className="font-mono font-bold text-slate-500">{rate.code_prefix}00</span> — déjalo vacío para generarlo automáticamente.
                                                    </p>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* SECCIÓN 2: TIPO DE CLIENTE (regla de cobro) */}
                <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-4 mb-2">
                        <Typography variant={TypographyVariant.SUBTITLE}>Tipo de Cliente</Typography>
                        <p className="text-xs font-medium text-slate-400 mt-1">
                            Define cómo se le cobra el flete. La entrega local (Correos/encomienda) siempre se cobra completa.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {customerTypes.map((type) => (
                            <button
                                type="button"
                                key={type.id}
                                onClick={() => setCustomerTypeId(String(type.id))}
                                className={`text-left cursor-pointer p-5 md:p-6 rounded-3xl border-2 transition-all flex flex-col gap-1 ${String(type.id) === customerTypeId ? 'border-amber-600 bg-amber-50/30 shadow-md' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'}`}
                            >
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-fit ${BILLING_MODE_STYLES[type.billing_mode] ?? 'bg-slate-100 text-slate-500'}`}>
                                    {type.name}
                                </span>
                                <p className="text-xs font-medium text-slate-400 mt-2">
                                    {BILLING_MODE_DESC(type.billing_mode, Number(type.discount_percent))}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* SECCIÓN 3: DIRECCIONES */}
                <div className="space-y-8">
                    <div className="flex justify-between items-center gap-3 border-b border-slate-100 pb-4">
                        <div className="min-w-0">
                            <Typography variant={TypographyVariant.SUBTITLE}>Direcciones de Entrega</Typography>
                            <p className="text-xs font-medium text-slate-400 mt-1">
                                Opcional — se pueden agregar después desde el detalle del cliente.
                            </p>
                            {sectionErrors.addresses && (
                                <p className="text-xs text-red-500 font-semibold mt-1">{sectionErrors.addresses}</p>
                            )}
                        </div>
                        <button type="button" onClick={addAddressField} className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-4 md:px-6 min-h-[44px] rounded-2xl hover:bg-amber-100 transition-all flex-shrink-0 whitespace-nowrap">
                            + Añadir
                        </button>
                    </div>

                    {addresses.length === 0 && (
                        <div className="p-6 md:p-8 bg-slate-50/50 rounded-[24px] md:rounded-[32px] border border-dashed border-slate-200 text-center">
                            <p className="text-sm font-semibold text-slate-500">Sin direcciones registradas</p>
                            <p className="text-xs font-medium text-slate-400 mt-1">
                                Puedes registrar el cliente así y añadir la dirección más adelante.
                            </p>
                        </div>
                    )}

                    {addresses.map((addr) => (
                        <div key={addr.id} className="p-5 md:p-8 bg-slate-50/50 rounded-[24px] md:rounded-[32px] border border-slate-100 relative">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest bg-white px-4 py-2 rounded-full shadow-sm">
                                        📍 {addr.address_label}
                                    </span>
                                    {addr.is_default && (
                                        <span className="text-[10px] font-black uppercase text-white bg-amber-600 px-3 py-1 rounded-full">Principal</span>
                                    )}
                                </div>
                                <button type="button" onClick={() => removeAddress(addr.id)} className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest">Eliminar</button>
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
                                    <FormInput label="Dirección Exacta" value={addr.exact_address} onChange={(e: any) => handleAddressChange(addr.id, 'exact_address', e.target.value)} placeholder="Detalles de la ubicación..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Etiqueta</label>
                                    <select
                                        value={addr.address_label}
                                        onChange={(e) => handleAddressChange(addr.id, 'address_label', e.target.value)}
                                        className="w-full bg-slate-50 border-transparent border rounded-[16px] md:rounded-[20px] px-4 py-3.5 md:px-6 md:py-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-slate-700 shadow-sm text-sm md:text-base"
                                    >
                                        {ADDRESS_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleAddressChange(addr.id, 'is_default', !addr.is_default)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${addr.is_default ? 'bg-amber-500' : 'bg-slate-300'}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${addr.is_default ? 'translate-x-4' : 'translate-x-1'}`} />
                                </button>
                                <span className="text-xs font-semibold text-slate-500">Marcar como dirección principal</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ACCIONES */}
                <div className="flex gap-4 pt-6 md:pt-10 border-t border-slate-50">
                    {/* Antes no tenía handler: se veía como botón pero no hacía nada. */}
                    <button type="button" onClick={cancel} disabled={isPending} className="flex-1 py-4 md:py-5 bg-slate-100 text-slate-500 rounded-[20px] md:rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50">Cancelar</button>
                    <button type="submit" disabled={isPending} className="flex-[2] py-4 md:py-5 bg-slate-900 text-white rounded-[20px] md:rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:shadow-2xl hover:bg-black transition-all shadow-lg shadow-slate-300 disabled:opacity-60 disabled:cursor-not-allowed">
                        {isPending ? 'Guardando...' : 'Registrar Cliente'}
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
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">{label}</label>
            <input
                ref={ref}
                {...props}
                className={`w-full bg-slate-50 border rounded-[16px] md:rounded-[20px] px-4 py-3.5 md:px-6 md:py-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-300 shadow-sm text-sm md:text-base ${error ? 'border-red-300 bg-red-50/30' : 'border-transparent'}`}
            />
            {error && <p className="text-xs text-red-500 font-semibold ml-2">{error}</p>}
        </div>
    ),
);
FormInput.displayName = 'FormInput';
