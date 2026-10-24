import React, { useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/common/modal/modal';
import { Button, ButtonVariant } from '@/components/common/button/button';
import { formatCount } from '@/shared/utils/format';
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
    <Modal
      title="Importar clientes"
      // La plantilla vive aquí, junto a la explicación: es el paso previo de importar.
      subtitle={
        <>
          Sube un Excel.{' '}
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex min-h-[44px] items-center text-amber-700 font-semibold underline hover:text-amber-800 transition-colors"
          >
            Descargar plantilla
          </button>
        </>
      }
      // Con el archivo a medias de importar no se cierra por accidente: ni tocando el fondo ni con Escape.
      onClose={() => { if (!isPending) handleClose(); }}
      closeOnOverlayClick={false}
      closeOnEscape={!isPending}
      showCloseButton={!isPending}
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant={ButtonVariant.CANCEL} onClick={handleClose} disabled={isPending}>
            {result ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!result && (
            <button
              type="button"
              onClick={handleImport}
              disabled={parsedRows.length === 0 || isPending}
              className="flex items-center justify-center gap-2 min-h-[44px] px-5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
      }
    >
      <div className="flex flex-col gap-4">

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
              <p className="text-sm font-semibold text-slate-700 break-all">
                {fileName ?? 'Elige un archivo de Excel'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {fileName ? 'Toca para cambiar el archivo' : '.xlsx o .xls'}
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
              <span className="text-sm font-bold text-red-600">Errores en el archivo</span>
            </div>
            <pre className="text-xs text-red-600 whitespace-pre-wrap leading-relaxed">{parseError}</pre>
          </div>
        )}

        {/* Preview: filas parseadas OK */}
        {parsedRows.length > 0 && !result && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
              <span className="text-sm font-bold text-emerald-700">
                {formatCount(uniqueCustomerCount, 'cliente listo', 'clientes listos')} para importar
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
                <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                <span className="text-sm font-bold text-emerald-700">
                  {formatCount(result.inserted, 'cliente importado', 'clientes importados')} correctamente
                </span>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={14} className="text-amber-500" />
                  <span className="text-sm font-bold text-amber-700">
                    {formatCount(result.errors.length, 'cliente con error', 'clientes con error')}
                  </span>
                </div>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <div key={i} className="text-xs text-amber-700">
                      <span className="font-bold">{err.id_card}</span>: {err.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
