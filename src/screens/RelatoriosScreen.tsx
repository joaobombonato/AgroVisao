import React, { useState } from 'react';
import { FileText, Download, Filter, Search, Table, FileSpreadsheet, File as FilePdf, ChevronRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { PageHeader } from '../components/ui/Shared';
import { toast } from 'react-hot-toast';

export default function RelatoriosScreen() {
  const { setTela } = useAppContext();
  const [search, setSearch] = useState('');

  const relatorios = [
    { 
      id: 'fat_refeicoes', 
      titulo: 'Faturamento de Refeições', 
      desc: 'Resumo mensal por fornecedor e cozinha.',
      categoria: 'Financeiro',
      icon: Table
    },
    { 
      id: 'custo_abast', 
      titulo: 'Custo de Abastecimento', 
      desc: 'Detalhamento por centro de custo e máquina.',
      categoria: 'Combustível',
      icon: FileSpreadsheet
    },
    { 
      id: 'extrato_chuvas', 
      titulo: 'Extrato de Chuvas', 
      desc: 'Acumulado mensal por safra e estação.',
      categoria: 'Clima',
      icon: FilePdf
    },
    { 
      id: 'uso_insumos', 
      titulo: 'Uso de Insumos', 
      desc: 'Relatório de saídas de estoque por talhão.',
      categoria: 'Estoque',
      icon: Table
    }
  ];

  const handleExport = (nome: string) => {
    toast.loading(`Gerando relatório: ${nome}...`, { duration: 2000 });
    setTimeout(() => {
        toast.dismiss();
        toast.success(`Relatório ${nome} exportado com sucesso!`);
    }, 2000);
  };

  const filtrados = relatorios.filter(r => 
    r.titulo.toLowerCase().includes(search.toLowerCase()) || 
    r.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 p-4 pb-24 animate-in fade-in duration-300">
      <PageHeader setTela={setTela} title="Central de Relatórios" icon={FileText} colorClass="bg-indigo-700" />

      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar relatório..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="w-full pl-9 pr-3 py-2 border-2 rounded-xl text-sm bg-white focus:border-indigo-500 outline-none transition-all" 
        />
      </div>

      <div className="space-y-3">
        {filtrados.map((rel: any) => {
          const Icon = rel.icon;
          return (
            <div key={rel.id} className="bg-white border-2 border-gray-100 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition-all group">
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-tighter text-indigo-500">{rel.categoria}</span>
                    <h3 className="font-bold text-gray-800 text-base">{rel.titulo}</h3>
                    <p className="text-[9px] text-gray-400 mt-1 leading-tight">{rel.desc}</p>
                  </div>
                </div>
                <button className="text-gray-300 hover:text-indigo-600 p-1">
                    <ChevronRight className="w-5 h-5"/>
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-50 flex gap-2">
                <button 
                  onClick={() => handleExport(rel.titulo)}
                  className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button 
                  onClick={() => handleExport(rel.titulo)}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors active:scale-95"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> EXCEL
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-amber-50 border-2 border-amber-100 p-4 rounded-xl mt-6 flex gap-3">
          <div className="bg-amber-100 text-amber-700 p-2 rounded-lg h-fit">
              <Filter className="w-5 h-5"/>
          </div>
          <div>
              <h4 className="font-bold text-amber-800 text-sm">Filtros Avançados</h4>
              <p className="text-[11px] text-amber-600 mt-1 leading-tight">Use os filtros em cada módulo para pré-visualizar antes de exportar o relatório final.</p>
          </div>
      </div>
    </div>
  );
}
