import React, { useState, useCallback } from 'react';
import { X, Settings, Download, RotateCcw, Lock, FileSpreadsheet } from 'lucide-react';
import { REPORT_COLUMNS, getDefaultColumns, type ReportColumnDef } from '../config/reportColumns';

interface ReportColumnsModalProps {
  reportId: string;
  reportTitle: string;
  exportType: 'pdf' | 'excel';
  onConfirm: (selectedKeys: string[]) => void;
  onClose: () => void;
}

export default function ReportColumnsModal({
  reportId,
  reportTitle,
  exportType,
  onConfirm,
  onClose
}: ReportColumnsModalProps) {
  const allColumns = REPORT_COLUMNS[reportId] || [];
  const [selected, setSelected] = useState<Set<string>>(() => {
    return new Set(getDefaultColumns(reportId));
  });

  const toggle = useCallback((key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const resetDefaults = useCallback(() => {
    setSelected(new Set(getDefaultColumns(reportId)));
  }, [reportId]);

  const handleConfirm = () => {
    // Mantém a ordem original das colunas
    const orderedKeys = allColumns
      .filter(c => selected.has(c.key))
      .map(c => c.key);
    onConfirm(orderedKeys);
  };

  // Agrupa colunas: primeiro as sem grupo, depois por grupo
  const grouped = allColumns.reduce<{ group: string; cols: ReportColumnDef[] }[]>((acc, col) => {
    const g = col.group || '';
    const existing = acc.find(x => x.group === g);
    if (existing) existing.cols.push(col);
    else acc.push({ group: g, cols: [col] });
    return acc;
  }, []);

  const selectedCount = selected.size;
  const totalCount = allColumns.length;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-white animate-in fade-in duration-200">
      {/* Header compacto */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-4 py-3 text-white shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Personalizar Relatório</h3>
              <p className="text-indigo-200 text-[10px] mt-0.5">{reportTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-indigo-200 text-[10px] font-bold uppercase tracking-wider">
            {selectedCount} de {totalCount} colunas selecionadas
          </span>
          <button
            onClick={resetDefaults}
            className="text-[10px] font-bold text-indigo-200 hover:text-white flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Restaurar Padrão
          </button>
        </div>
      </div>

      {/* Body — Column toggles (ocupa todo espaço restante) */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
        {grouped.map(({ group, cols }) => (
          <div key={group || '__root'}>
            {group && (
              <div className="flex items-center gap-2 mt-3 mb-1.5">
                <div className="h-px flex-1 bg-indigo-100" />
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">{group}</span>
                <div className="h-px flex-1 bg-indigo-100" />
              </div>
            )}
            {cols.map(col => {
              const isOn = selected.has(col.key);
              return (
                <button
                  key={col.key}
                  onClick={() => !col.required && toggle(col.key)}
                  disabled={col.required}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left ${
                    col.required
                      ? 'bg-indigo-50/70 cursor-default'
                      : isOn
                        ? 'bg-white hover:bg-gray-50 active:scale-[0.98]'
                        : 'bg-gray-50 hover:bg-gray-100 active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {col.required && <Lock className="w-3 h-3 text-indigo-400" />}
                    <span className={`text-sm font-medium ${
                      col.required ? 'text-indigo-600' : isOn ? 'text-gray-800' : 'text-gray-400'
                    }`}>
                      {col.label}
                    </span>
                    {col.required && (
                      <span className="text-[8px] font-black uppercase bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded-full">
                        Essencial
                      </span>
                    )}
                  </div>
                  
                  {/* Toggle */}
                  <div className={`w-10 rounded-full p-0.5 transition-colors duration-200 ${
                    col.required
                      ? 'bg-indigo-400'
                      : isOn
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                  }`}
                    style={{ height: 22 }}
                  >
                    <div className={`bg-white rounded-full shadow-sm transition-transform duration-200 ${
                      isOn || col.required ? 'translate-x-[18px]' : 'translate-x-0'
                    }`}
                      style={{ width: 18, height: 18 }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer fixo no fundo */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
        <button
          onClick={handleConfirm}
          className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${
            exportType === 'pdf'
              ? 'bg-gray-900 text-white hover:bg-black'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {exportType === 'pdf' ? (
            <><Download className="w-4 h-4" /> Gerar PDF</>
          ) : (
            <><FileSpreadsheet className="w-4 h-4" /> Gerar Excel</>
          )}
        </button>
      </div>
    </div>
  );
}
