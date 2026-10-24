import { PackageType } from '@/types/logistics/logistics.types';

export const PACKAGE_TYPE_LABEL: Record<PackageType, string> = {
  [PackageType.AEREO]: 'Aéreo',
  [PackageType.MARITIMO]: 'Marítimo',
};

// El estado del paquete vive en status-labels.ts; se re-exporta para no tocar los imports.
export { PACKAGE_STATUS_LABEL, packageStatusLabel } from './status-labels';

export const packageTypeLabel = (type: string): string =>
  PACKAGE_TYPE_LABEL[type as PackageType] ?? type;
