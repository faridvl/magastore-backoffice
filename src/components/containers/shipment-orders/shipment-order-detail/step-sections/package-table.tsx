import { formatWeight } from '@/shared/utils/format';
import React from 'react';
import { Package, X } from 'lucide-react';
import { ConsolidationPackage } from '@/types/logistics/logistics.types';
import { packageStatusLabel, packageTypeLabel } from '@/shared/constants/package-labels';

export const PackageTable: React.FC<{
  packages: ConsolidationPackage[];
  canUnassign: boolean;
  isUnassigning: boolean;
  onUnassign: (packageUuid: string) => void;
}> = ({ packages, canUnassign, isUnassigning, onUnassign }) => (
  <ul className="space-y-2">
    {packages.map((pkg) => (
      <li key={pkg.uuid} className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl">
        <Package size={16} className="text-slate-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm font-bold text-slate-800 [overflow-wrap:anywhere]">{pkg.tracking_number}</p>
          <p className="text-xs text-slate-500">
            {formatWeight(pkg.weight_lb)} · {packageTypeLabel(pkg.package_type)}
            {pkg.store_name ? ` · ${pkg.store_name}` : ''}
            {/* En móvil el estado va en esta línea: al costado dejaba sin lugar al número. */}
            <span className="sm:hidden"> · {packageStatusLabel(pkg.status)}</span>
          </p>
        </div>
        <span className="hidden sm:inline text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg flex-shrink-0 whitespace-nowrap">
          {packageStatusLabel(pkg.status)}
        </span>
        {canUnassign && (
          <button
            type="button"
            onClick={() => onUnassign(pkg.uuid)}
            disabled={isUnassigning}
            aria-label={`Quitar ${pkg.tracking_number} de la orden`}
            title="Quitar de la orden"
            className="flex items-center justify-center min-h-[40px] min-w-[40px] rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 flex-shrink-0"
          >
            <X size={16} />
          </button>
        )}
      </li>
    ))}
  </ul>
);
