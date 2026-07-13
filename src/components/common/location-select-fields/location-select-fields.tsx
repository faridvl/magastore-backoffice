import React from 'react';
import { COSTA_RICA_LOCATIONS, getCantons, getDistricts } from '@/shared/constants/costa-rica-locations';

interface LocationSelectFieldsProps {
  province: string;
  canton: string;
  district: string;
  onChange: (field: 'province' | 'canton' | 'district', value: string) => void;
  selectClassName: string;
  labelClassName: string;
}

/**
 * Dropdowns encadenados provincia → cantón → distrito. Cambiar la provincia
 * resetea cantón/distrito; cambiar el cantón resetea distrito — evita
 * combinaciones inválidas que no existen en la división territorial de CR.
 */
export const LocationSelectFields: React.FC<LocationSelectFieldsProps> = ({
  province,
  canton,
  district,
  onChange,
  selectClassName,
  labelClassName,
}) => {
  const cantons = getCantons(province);
  const districts = getDistricts(province, canton);

  return (
    <>
      <div className="space-y-2">
        <label className={labelClassName}>Provincia</label>
        <select
          value={province}
          onChange={(e) => onChange('province', e.target.value)}
          className={selectClassName}
        >
          <option value="">Seleccionar...</option>
          {COSTA_RICA_LOCATIONS.map((p) => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className={labelClassName}>Cantón</label>
        <select
          value={canton}
          onChange={(e) => onChange('canton', e.target.value)}
          disabled={!province}
          className={selectClassName}
        >
          <option value="">Seleccionar...</option>
          {cantons.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className={labelClassName}>Distrito</label>
        <select
          value={district}
          onChange={(e) => onChange('district', e.target.value)}
          disabled={!canton}
          className={selectClassName}
        >
          <option value="">Seleccionar...</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
    </>
  );
};
