import React from 'react';
import { Package, X } from 'lucide-react';
import { ConsolidationPackage } from '@/types/logistics/logistics.types';

export const PackageTable: React.FC<{
  packages: ConsolidationPackage[];
  canUnassign: boolean;
  isUnassigning: boolean;
  onUnassign: (packageUuid: string) => void;
}> = ({ packages, canUnassign, isUnassigning, onUnassign }) => (
  <div className="space-y-2">
    {packages.map((pkg) => (
      <div
        key={pkg.uuid}
        className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl"
      >
        <Package size={14} className="text-slate-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm font-bold text-slate-800 truncate" title={pkg.tracking_number}>{pkg.tracking_number}</p>
          <p className="text-[10px] text-slate-400 truncate">
            {Number(pkg.weight_lb).toFixed(2)} lb · {pkg.package_type}{pkg.store_name ? ` · ${pkg.store_name}` : ''}
          </p>
        </div>
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg flex-shrink-0 whitespace-nowrap">
          {pkg.status}
        </span>
        {canUnassign && (
          <button
            onClick={() => onUnassign(pkg.uuid)}
            disabled={isUnassigning}
            title="Quitar de la orden de envío"
            className="p-2.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 flex-shrink-0"
          >
            <X size={16} />
          </button>
        )}
      </div>
    ))}
  </div>
);
