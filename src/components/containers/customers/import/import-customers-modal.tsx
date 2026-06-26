import React, { useCallback } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { useImportCustomers } from './use-import-customers';

interface ImportCustomersModalProps {
  onClose: () => void;
}

export const ImportCustomersModal: React.FC<ImportCustomersModalProps> = ({ onClose }) => {
  const {
    parsedRows,
    uniqueCustomerCount,
    parseError,
    result,
    fileName,
    isPending,
    parseFile,
    handleImport,
    handleClose,
    downloadTemplate,
  } = useImportCustomers(onClose);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) parseFile(file);
    },
    [parseFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) parseFile(file);
    },
    [parseFile],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-50 rounded-2xl flex items-center justify-center">
              <Upload size={16} className="text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Importar Clientes</h2>
              <p className="text-[11px] text-slate-400">Carga masiva desde archivo Excel</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">

          {/* Descarga template */}
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors w-fit"
          >
            <Download size={13} />
            Descargar template de ejemplo
          </button>

          {/* Zona de carga */}
          {!result && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-amber-300 transition-colors cursor-pointer"
              onClick={() => document.getElementById('import-file-input')?.click()}
            >
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                <FileSpreadsheet size={22} className="text-slate-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">
                  {fileName ?? 'Arrastra tu archivo aquí'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {fileName ? 'Haz clic para cambiar el archivo' : 'o haz clic para seleccionarlo — .xlsx o .xls'}
                </p>
              </div>
              <input
                id="import-file-input"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          )}

          {/* Error de parseo */}
          {parseError && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={14} className="text-red-500" />
                <span className="text-xs font-bold text-red-600">Errores en el archivo</span>
              </div>
              <pre className="text-[11px] text-red-500 whitespace-pre-wrap leading-relaxed">{parseError}</pre>
            </div>
          )}

          {/* Preview: filas parseadas OK */}
          {parsedRows.length > 0 && !result && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" />
                <span className="text-xs font-bold text-emerald-700">
                  {uniqueCustomerCount} cliente{uniqueCustomerCount !== 1 ? 's' : ''} listos para importar
                  {parsedRows.length !== uniqueCustomerCount && ` (${parsedRows.length} filas → ${uniqueCustomerCount} clientes únicos)`}
                </span>
              </div>
            </div>
          )}

          {/* Resultado del import */}
          {result && (
            <div className="flex flex-col gap-3">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-700">
                    {result.inserted} cliente{result.inserted !== 1 ? 's' : ''} importado{result.inserted !== 1 ? 's' : ''} correctamente
                  </span>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={14} className="text-amber-500" />
                    <span className="text-xs font-bold text-amber-700">
                      {result.errors.length} cliente{result.errors.length !== 1 ? 's' : ''} con error
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <div key={i} className="text-[11px] text-amber-700">
                        <span className="font-bold">{err.id_card}</span>: {err.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {result ? 'Cerrar' : 'Cancelar'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={parsedRows.length === 0 || isPending}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Importar {uniqueCustomerCount > 0 ? `(${uniqueCustomerCount})` : ''}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
