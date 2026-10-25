import { formatBusinessDate } from '@/shared/utils/timezone';
import { formatWeight, formatUsd } from '@/shared/utils/format';
import React from 'react';
import Link from 'next/link';
import { Package, Search, ChevronDown, Check, Save, Calculator, Settings, Loader2, MapPin, AlertTriangle } from 'lucide-react';
import { usePackageCalculator } from './use-package-calculator';
import { routesPrivate } from '@/shared/navigation/routes';
import { CustomerBillingMode } from '@/types/customer/customer.types';
import { CustomerTypeBadge } from '@/components/common/customer-type-badge/customer-type-badge';
import { Button, ButtonVariant } from '@/components/common/button/button';
import { Modal } from '@/components/common/modal/modal';
import { formatCrc } from '@/shared/utils/format-crc';

const EMPTY_AMOUNT = '—';

// Los inputs van a 16 px (text-base): con menos, iOS hace zoom al enfocarlos.
const FIELD_LABEL = 'text-sm font-semibold text-slate-600 mb-1 block ml-1';
const FIELD_BASE = 'w-full min-h-[44px] p-3 bg-slate-50 border border-slate-100 rounded-2xl text-base outline-none transition-all';
const CONFIG_LABEL = 'text-xs text-slate-500 font-semibold';

export const CreatePackageContainer: React.FC = () => {
    const {
        formData, setFormData, calculations, settings, courierRates, selectedCourierRate,
        customers, selectedCustomer, customerAddresses, searchTerm, setSearchTerm,
        isOpen, setIsOpen, handleSave, isSaving, isLoading,
        missingWarehouse, dismissMissingWarehouse, handleAssignWarehouseCode, isAssigningCode,
        hasNoWarehouse, allCourierRates
    } = usePackageCalculator();

    // Courier elegido en el aviso de "cliente sin casillero". Se guarda aquí
    // porque solo existe mientras ese modal está abierto.
    const [routeToAssign, setRouteToAssign] = React.useState<string>('');

    if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-amber-500" /></div>;

    const customerName = selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : null;
    const hasLiveAmount = calculations.cobroTotalCRC > 0;

    return (
        <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 p-4">

            {/* COLUMNA IZQUIERDA: FORMULARIO */}
            <div className="xl:col-span-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 md:p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-amber-600 text-white rounded-xl"><Package size={20} /></div>
                    <h2 className="text-lg font-bold text-slate-800">Registrar paquete</h2>
                </div>

                <div className="space-y-6">
                    {/* CLIENTE */}
                    <div className="relative">
                        <span className={FIELD_LABEL}>Cliente</span>
                        <button
                            type="button"
                            onClick={() => setIsOpen(!isOpen)}
                            className="w-full min-h-[44px] p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-slate-100 transition-all"
                        >
                            <span className={`text-base ${selectedCustomer ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                                {selectedCustomer ? `${selectedCustomer.customer_code} | ${customerName}` : "Seleccionar cliente..."}
                            </span>
                            <ChevronDown size={16} className={`flex-shrink-0 ${isOpen ? 'rotate-180 transition-all' : ''}`} />
                        </button>

                        {isOpen && (
                            <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden">
                                <div className="p-3 bg-slate-50 border-b border-slate-100">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            autoFocus
                                            aria-label="Buscar cliente"
                                            className="w-full min-h-[44px] pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-base outline-none"
                                            placeholder="Buscar cliente..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    {customers.map(c => (
                                        <button
                                            type="button"
                                            key={c.id}
                                            onClick={() => { setFormData({ ...formData, customer_id: c.id }); setIsOpen(false); }}
                                            className="w-full min-h-[44px] p-3 hover:bg-amber-50 cursor-pointer flex justify-between items-center gap-3 text-left transition-colors"
                                        >
                                            <span className="text-sm font-medium">{c.customer_code} — {c.first_name} {c.last_name}</span>
                                            {formData.customer_id === c.id && <Check size={14} className="text-amber-600 flex-shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* DIRECCIÓN DE ENTREGA */}
                    {formData.customer_id && (
                        <div>
                            <label htmlFor="package-address" className={FIELD_LABEL}>Dirección de entrega</label>
                            {customerAddresses.length === 0 ? (
                                <div className="flex items-center gap-2 p-4 bg-orange-50 rounded-2xl border border-orange-100 text-sm text-orange-700">
                                    <MapPin size={14} />
                                    <span>Este cliente no tiene direcciones registradas.</span>
                                </div>
                            ) : (
                                <select
                                    id="package-address"
                                    className={`${FIELD_BASE} font-medium focus:border-amber-200`}
                                    value={formData.address_id ?? ''}
                                    onChange={(e) => setFormData({ ...formData, address_id: e.target.value || null })}
                                >
                                    <option value="">Sin dirección específica</option>
                                    {customerAddresses.map((addr) => (
                                        <option key={addr.id} value={addr.id}>
                                            {addr.address_label} — {addr.province}, {addr.canton}{addr.is_default ? ' (Principal)' : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="package-tracking" className={FIELD_LABEL}>Número de rastreo</label>
                            <input
                                id="package-tracking"
                                className={`${FIELD_BASE} font-mono uppercase focus:bg-white focus:border-amber-200`}
                                placeholder="0000000000"
                                value={formData.tracking_number}
                                onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                            />
                        </div>
                        <div>
                            <label htmlFor="package-weight" className={FIELD_LABEL}>Peso (lb)</label>
                            <input
                                id="package-weight"
                                type="number"
                                min="1"
                                step="1"
                                className={`${FIELD_BASE} font-bold focus:bg-white`}
                                value={formData.weight_lb || ''}
                                onKeyDown={(e) => ['.', ',', 'e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                                onChange={(e) => setFormData({ ...formData, weight_lb: Math.max(1, Math.floor(Number(e.target.value))) })}
                            />
                            {settings?.min_weight && (
                                <p className="mt-1 ml-1 text-sm text-slate-500">
                                    Menos de {formatWeight(settings.min_weight)} se cobra como {formatWeight(settings.min_weight)}.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* COURIER RATE + TC BANCO */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="package-courier-rate" className={FIELD_LABEL}>Tarifa del courier</label>
                            {courierRates.length === 0 ? (
                                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 space-y-2">
                                    <p className="text-sm text-red-700 font-semibold">
                                        {formData.customer_id
                                            ? 'Este cliente no tiene casillero en ningún courier activo. Asígnale uno desde su ficha.'
                                            : 'No hay tarifas de courier activas. Todo paquete debe registrar su costo real.'}
                                    </p>
                                    <Link
                                        href={routesPrivate.admin.courierRates}
                                        className="inline-flex items-center gap-1 min-h-[44px] text-sm font-bold text-red-700 underline underline-offset-2"
                                    >
                                        Configurar tarifa de courier
                                    </Link>
                                </div>
                            ) : (
                                <select
                                    id="package-courier-rate"
                                    className={`${FIELD_BASE} font-medium focus:border-amber-200`}
                                    value={formData.courier_rate_id ?? ''}
                                    onChange={(e) => setFormData({ ...formData, courier_rate_id: e.target.value || null })}
                                >
                                    <option value="">Selecciona una tarifa...</option>
                                    {courierRates.map((r) => (
                                        <option key={r.uuid} value={r.uuid}>
                                            {r.name} — {formatUsd(Number(r.rate_usd))}/lb
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div>
                            <label htmlFor="package-bank-exchange" className={FIELD_LABEL}>Tipo de cambio del banco</label>
                            <input
                                id="package-bank-exchange"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Ej: 518.50"
                                className={`${FIELD_BASE} font-bold focus:bg-white`}
                                value={formData.tc_banco || ''}
                                onChange={(e) => setFormData({ ...formData, tc_banco: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    {selectedCourierRate && (
                        <label className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={formData.insurance_applied}
                                onChange={(e) => setFormData({ ...formData, insurance_applied: e.target.checked })}
                                className="w-5 h-5 accent-amber-500"
                            />
                            <span className="text-sm font-semibold text-slate-600">
                                Seguro del courier cobrado
                                {selectedCourierRate.insurance_usd ? ` (${formatUsd(Number(selectedCourierRate.insurance_usd))})` : ''}
                            </span>
                        </label>
                    )}

                    <Button
                        variant={ButtonVariant.PRIMARY}
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full p-4"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Guardar paquete
                    </Button>
                </div>
            </div>

            {/* COLUMNA DERECHA: CONFIG Y TOTALES */}
            <div className="xl:col-span-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-6 content-start">

                {/* CARD DE TOTALES */}
                <div className="bg-slate-900 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
                    <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-amber-500/5 rounded-full blur-xl" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-1.5 bg-amber-500/20 rounded-lg">
                                <Calculator size={14} className="text-amber-400" />
                            </div>
                            <span className="text-sm font-semibold text-slate-300">Cálculo en vivo</span>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-semibold text-slate-400 mb-1">Cobro al cliente</p>
                                <h3 className="whitespace-nowrap text-2xl md:text-3xl font-black text-white">
                                    {hasLiveAmount ? formatCrc(calculations.cobroTotalCRC) : EMPTY_AMOUNT}
                                </h3>
                                {/* El monto ya no es el de lista: se dice de dónde sale para que
                                    el operador no lo lea como un error de cálculo. */}
                                {calculations.billingMode !== CustomerBillingMode.NORMAL && selectedCustomer && (
                                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                                        <CustomerTypeBadge
                                            name={selectedCustomer.customer_type_name ?? 'Tipo especial'}
                                            mode={calculations.billingMode}
                                            discount={calculations.discountPercent}
                                        />
                                        {calculations.listaCRC > 0 && (
                                            <span className="whitespace-nowrap text-xs font-bold text-slate-400 line-through">
                                                {formatCrc(calculations.listaCRC)}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {calculations.courierCostCRC > 0 && (
                                <div className="pt-4 border-t border-white/5 space-y-2">
                                    <div className="flex justify-between items-center gap-3">
                                        <p className="text-sm font-semibold text-slate-400">Costo del courier</p>
                                        <p className="whitespace-nowrap text-sm font-bold text-slate-300">
                                            {formatUsd(calculations.courierCostUSD)} · {formatCrc(calculations.courierCostCRC)}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center gap-3">
                                        <p className="text-sm font-semibold text-slate-400">Ganancia estimada</p>
                                        <p className={`whitespace-nowrap text-sm font-bold ${calculations.ganancia >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                                            {formatCrc(calculations.ganancia)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CARD DE CONFIGURACIÓN DEL SISTEMA */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-slate-800">
                        <Settings size={16} />
                        <span className="text-sm font-bold">Configuración actual</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-4">
                        <div>
                            <p className={CONFIG_LABEL}>Precio por lb</p>
                            <p className="whitespace-nowrap text-sm font-black text-slate-700">{formatUsd(Number(settings?.price_per_lb ?? 0))}</p>
                        </div>
                        <div>
                            <p className={CONFIG_LABEL}>Tipo de cambio</p>
                            <p className="whitespace-nowrap text-sm font-black text-slate-700">{formatCrc(Number(settings?.exchange_rate ?? 0))}</p>
                        </div>
                        <div>
                            <p className={CONFIG_LABEL}>Mínimo</p>
                            <p className="whitespace-nowrap text-sm font-black text-slate-700">{formatWeight(settings?.min_weight)}</p>
                        </div>
                        <div>
                            <p className={CONFIG_LABEL}>Última actualización</p>
                            <p className="text-sm font-medium text-slate-600">{formatBusinessDate(settings?.updated_at || '')}</p>
                        </div>
                    </div>
                </div>

            </div>

            {/* El cliente no tiene NINGÚN casillero: se avisa al elegirlo, antes
                de que el operador cargue tracking y peso para nada. */}
            {hasNoWarehouse && !missingWarehouse && (
                <Modal
                    title="Este cliente no tiene casilleros"
                    onClose={() => setFormData({ ...formData, customer_id: '' })}
                    closeOnOverlayClick={false}
                    closeOnEscape={false}
                    showCloseButton={false}
                    footer={
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                                variant={ButtonVariant.PRIMARY}
                                className="flex-1"
                                onClick={async () => {
                                    await handleAssignWarehouseCode(routeToAssign);
                                    setRouteToAssign('');
                                }}
                                disabled={isAssigningCode || !routeToAssign}
                            >
                                {isAssigningCode ? <><Loader2 size={14} className="animate-spin" /> Asignando...</> : 'Asignar casillero'}
                            </Button>
                            <Button
                                variant={ButtonVariant.GHOST}
                                onClick={() => setFormData({ ...formData, customer_id: '' })}
                                disabled={isAssigningCode}
                            >
                                Elegir otro cliente
                            </Button>
                        </div>
                    }
                >
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-amber-50 rounded-2xl flex-shrink-0">
                            <AlertTriangle size={20} className="text-amber-500" />
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            {customerName ?? 'El cliente'} no
                            tiene ningún courier configurado, así que no hay dirección a la que su mercancía haya podido llegar.
                            Asígnale uno para poder registrar paquetes.
                        </p>
                    </div>

                    <div className="mt-5">
                        <label htmlFor="package-assign-courier" className={FIELD_LABEL}>Courier</label>
                        <select
                            id="package-assign-courier"
                            className={`${FIELD_BASE} font-medium`}
                            value={routeToAssign}
                            onChange={(e) => setRouteToAssign(e.target.value)}
                        >
                            <option value="">Selecciona un courier...</option>
                            {allCourierRates.map((r) => (
                                <option key={r.uuid} value={r.uuid}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                </Modal>
            )}

            {missingWarehouse && (
                <Modal
                    title="Falta el casillero del cliente"
                    onClose={dismissMissingWarehouse}
                    closeOnOverlayClick={false}
                    closeOnEscape={false}
                    showCloseButton={false}
                    footer={
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                                variant={ButtonVariant.PRIMARY}
                                className="flex-1"
                                onClick={() => handleAssignWarehouseCode()}
                                disabled={isAssigningCode}
                            >
                                {isAssigningCode ? <><Loader2 size={14} className="animate-spin" /> Asignando...</> : 'Asignar casillero y registrar'}
                            </Button>
                            <Button
                                variant={ButtonVariant.GHOST}
                                onClick={dismissMissingWarehouse}
                                disabled={isAssigningCode}
                            >
                                Cancelar
                            </Button>
                        </div>
                    }
                >
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-amber-50 rounded-2xl flex-shrink-0">
                            <AlertTriangle size={20} className="text-amber-500" />
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            {customerName ?? 'Este cliente'} no
                            tiene código asignado para <strong>{missingWarehouse.rateName}</strong>. Sin casillero en esa ruta el
                            paquete no puede registrarse, porque no hay dirección a la que esa mercancía haya podido llegar.
                        </p>
                    </div>
                </Modal>
            )}
        </div>
    );
};
