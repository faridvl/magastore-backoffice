import { PackageStatus, PackageType } from '@/types/logistics/logistics.types';

export const PACKAGE_STATUS_LABEL: Record<PackageStatus, string> = {
  [PackageStatus.PANAMA]: 'En Panamá',
  [PackageStatus.EN_TRAMITE]: 'En trámite',
  [PackageStatus.ENTREGADO]: 'Entregado',
};

export const PACKAGE_TYPE_LABEL: Record<PackageType, string> = {
  [PackageType.AEREO]: 'Aéreo',
  [PackageType.MARITIMO]: 'Marítimo',
};

/** Las columnas son TEXT: un valor fuera del enum se muestra tal cual en vez de vacío. */
export const packageStatusLabel = (status: string): string =>
  PACKAGE_STATUS_LABEL[status as PackageStatus] ?? status;

export const packageTypeLabel = (type: string): string =>
  PACKAGE_TYPE_LABEL[type as PackageType] ?? type;
