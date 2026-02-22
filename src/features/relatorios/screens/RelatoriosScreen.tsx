import React from 'react';
import { FileText, Filter, Search } from 'lucide-react';
import { PageHeader } from '../../../components/ui/Shared';
import useRelatorios from '../hooks/useRelatorios';
import ReportCard from '../components/ReportCard';
import ReportColumnsModal from '../components/ReportColumnsModal';

export default function RelatoriosScreen() {
  const {
    setTela,
    search, setSearch,
    dateStart, setDateStart,
    dateEnd, setDateEnd,
    modalConfig, setModalConfig,
    filtrados,
    openExportModal,
    handleExport
  } = useRelatorios();

  return (
    <div className="space-y-4 p-4 pb-24 animate-in fade-in duration-300">
      <PageHeader setTela={setTela} title="Central de Relatórios" icon={FileText} colorClass="bg-indigo-700" badge="Beta" />

      {/* Busca */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar relatório..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border-2 rounded-xl text-sm bg-white focus:border-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Filtro de Período */}
      <div className="bg-white border-2 border-indigo-100 p-4 rounded-xl shadow-sm">
        <h4 className="text-xs font-black text-indigo-700 uppercase mb-3 flex items-center gap-2">
          <Filter className="w-4 h-4" /> Filtro de Período (Intervalo de Datas)
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Início</label>
            <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Fim</label>
            <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm outline-none focus:border-indigo-500" />
          </div>
        </div>
      </div>

      {/* Alerta Filtros Avançados */}
      <div className="bg-amber-50 border-2 border-amber-100 p-3 rounded-xl mb-4 flex gap-3">
        <div className="bg-amber-100 text-amber-700 p-2 rounded-lg h-fit">
          <Filter className="w-4 h-4"/>
        </div>
        <div>
          <h4 className="font-bold text-amber-800 text-xs">Filtros Avançados</h4>
          <p className="text-[10px] text-amber-600 mt-0.5 leading-tight">Use os filtros em cada módulo para pré-visualizar antes de exportar o relatório final.</p>
        </div>
      </div>

      {/* Cards dos Relatórios */}
      <div className="space-y-3">
        {filtrados.map(rel => (
          <ReportCard
            key={rel.id}
            rel={rel}
            onExportPdf={() => openExportModal('pdf', rel.id, rel.titulo)}
            onExportExcel={() => openExportModal('excel', rel.id, rel.titulo)}
          />
        ))}
      </div>

      {/* Modal de Personalização de Colunas */}
      {modalConfig && (
        <ReportColumnsModal
          reportId={modalConfig.reportId}
          reportTitle={modalConfig.reportTitle}
          exportType={modalConfig.exportType}
          onClose={() => setModalConfig(null)}
          onConfirm={(selectedKeys) => {
            const cfg = modalConfig;
            setModalConfig(null);
            handleExport(cfg.exportType, cfg.reportId, cfg.reportTitle, selectedKeys);
          }}
        />
      )}
    </div>
  );
}
