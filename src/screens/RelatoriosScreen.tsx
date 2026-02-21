import React, { useState } from 'react';
import { FileText, Download, Filter, Search, Table, FileSpreadsheet, File as FilePdf, ChevronRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { PageHeader } from '../components/ui/Shared';
import { toast } from 'react-hot-toast';
import { exportService } from '../services';
import { U } from '../utils';

export default function RelatoriosScreen() {
  const { setTela, state, fazendaSelecionada } = useAppContext();
  const [search, setSearch] = useState('');
  
  // Filtros de Data
  const [dateStart, setDateStart] = useState(U.todayIso().slice(0, 8) + '01'); // Início do mês
  const [dateEnd, setDateEnd] = useState(U.todayIso());

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
      titulo: 'Relatório de Abastecimentos', 
      desc: 'Histórico cronológico com saldo de estoque e médias.',
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

  const handleExport = async (type: 'pdf' | 'excel', relId: string, titulo: string) => {
    const loadingToast = toast.loading(`Preparando ${type.toUpperCase()}: ${titulo}...`);
    
    try {
      const { dados, ativos } = state;
      const fNome = fazendaSelecionada?.nome || state.fazendaNome || 'Fazenda';
      const logo = ativos?.parametros?.logoBase64 || '';
      
      const periodStr = `Período: ${U.formatDate(dateStart)} até ${U.formatDate(dateEnd)}`;
      
      let columns: string[] = [];
      let data: any[][] = [];
      let rawData: any[] = [];
      let filename = titulo.replace(/\s+/g, '_');

      // Coleta e Tratamento de Dados por Tipo
      if (relId === 'custo_abast') {
        const abastecimentosRaw = (dados.abastecimentos || []).filter((a: any) => {
          const d = a.data_operacao || a.data;
          return d >= dateStart && d <= dateEnd;
        });
        const compras = (dados.compras || []).filter((c: any) => {
          const d = c.data;
          return d >= dateStart && d <= dateEnd;
        });
        const maquinas = ativos?.maquinas || [];

        // 1. Estoque Inicial
        const pEstoque = ativos.parametros?.estoque || {};
        const estoqueInicial = U.parseDecimal(pEstoque.ajusteManual || 0);

        // 2. Timeline unificada (Compras + Abastecimentos)
        type TimelineEvent = {
          date: string;
          type: 'entrada' | 'saida';
          qtd: number;
          ref: any;
        };

        const timeline: TimelineEvent[] = [
          ...compras.map((c: any) => ({
            date: c.data,
            type: 'entrada' as const,
            qtd: U.parseDecimal(c.litros || 0),
            ref: c
          })),
          ...abastecimentosRaw.map((a: any) => ({
            date: a.data_operacao || a.data,
            type: 'saida' as const,
            qtd: U.parseDecimal(a.litros || a.qtd || 0),
            ref: a
          }))
        ];

        // Ordenação ascendente para cálculo do saldo
        timeline.sort((a, b) => a.date.localeCompare(b.date));

        // 3. Processamento do Saldo
        let saldoAtual = estoqueInicial;
        const registrosComSaldo: any[] = [];

        timeline.forEach(event => {
          if (event.type === 'entrada') {
            saldoAtual += event.qtd;
          } else {
            saldoAtual -= event.qtd;
            // Só adicionamos saídas (abastecimentos) ao relatório final de custo
            registrosComSaldo.push({
              ...event.ref,
              saldoCalculado: saldoAtual
            });
          }
        });

        // 4. Ordenação final para o relatório (Descendente conforme pedido anteriormente)
        const registros = [...registrosComSaldo].sort((a, b) => {
          const ba = U.parseDecimal(a.bomba_inicial || a.bombaInicial || 0);
          const bb = U.parseDecimal(b.bomba_inicial || b.bombaInicial || 0);
          return bb - ba;
        });

        columns = [
          'Data', 
          'Bomba Inicial', 
          'Bomba Final', 
          'Estoque Final', 
          'Máquina (Marca/Modelo)', 
          'Litros', 
          'Início (KM/H)', 
          'Final (KM/H)', 
          'Média', 
          'Custo R$'
        ];

        data = registros.map((r: any) => {
          const maq = maquinas.find((m: any) => m.nome === r.maquina || m.identificacao === r.maquina);
          const brand = maq?.fabricante || '';
          const model = maq?.descricao || '';
          const maqFull = maq ? `${r.maquina} - ${brand} ${model}`.trim() : r.maquina;
          
          const isKM = maq?.unidade_medida?.toLowerCase().includes('km');
          const suffix = isKM ? ' KM/L' : ' L/HR';
          const formattedMedia = U.formatMedia(r.media);
          const mediaStr = formattedMedia === '-' ? '-' : `${formattedMedia}${suffix}`;

          return [
            U.formatDate(r.data_operacao || r.data),
            U.formatInt(r.bomba_inicial || r.bombaInicial || 0),
            U.formatInt(r.bomba_final || r.bombaFinal || 0),
            U.formatInt(r.saldoCalculado), // Removido decimais do Estoque Final a pedido do usuario
            maqFull,
            U.formatHorimetro(r.litros || r.qtd || 0),
            U.formatHorimetro(r.horimetro_anterior || r.horimetroAnterior || 0),
            U.formatHorimetro(r.horimetro_atual || r.horimetroAtual || 0),
            mediaStr,
            `R$ ${U.formatValue(r.custo || 0)}`
          ];
        });

        rawData = registros.map((r: any) => {
          const maq = maquinas.find((m: any) => m.nome === r.maquina || m.identificacao === r.maquina);
          const isKM = maq?.unidade_medida?.toLowerCase().includes('km');
          const suffix = isKM ? ' KM/L' : ' L/HR';
          const formattedMedia = U.formatMedia(r.media);
          
          return {
            'Data': U.formatDate(r.data_operacao || r.data),
            'Bomba Inicial': U.parseDecimal(r.bomba_inicial || r.bombaInicial || 0),
            'Bomba Final': U.parseDecimal(r.bomba_final || r.bombaFinal || 0),
            'Saldo Estoque': U.parseDecimal(r.saldoCalculado),
            'Máquina': r.maquina,
            'Identificação': maq?.identificacao || '',
            'Marca': maq?.fabricante || '',
            'Modelo': maq?.descricao || '',
            'Litros': U.parseDecimal(r.litros || r.qtd),
            'KM/H Inicial': U.parseDecimal(r.horimetro_anterior || r.horimetroAnterior || 0),
            'KM/H Final': U.parseDecimal(r.horimetro_atual || r.horimetroAtual || 0),
            'Média': formattedMedia === '-' ? '-' : `${formattedMedia}${suffix}`,
            'Custo R$': U.parseDecimal(r.custo || 0)
          };
        });
      } 
      else if (relId === 'fat_refeicoes') {
        const registros = dados.refeicoes || [];
        columns = ['Data', 'Fornecedor', 'Tipo', 'Qtd', 'Valor'];
        data = registros.map((r: any) => [
          U.formatDate(r.data_refeicao || r.data),
          r.cozinha || r.fornecedor,
          r.tipo,
          r.quantidade || r.qtd,
          `R$ ${U.formatValue(r.valor || 0)}`
        ]);
        rawData = registros.map((r: any) => ({
          Data: U.formatDate(r.data_refeicao || r.data),
          Fornecedor: r.cozinha || r.fornecedor,
          Tipo: r.tipo,
          Quantidade: r.quantidade || r.qtd,
          Valor: U.parseDecimal(r.valor || 0)
        }));
      }
      else if (relId === 'extrato_chuvas') {
        const registros = dados.chuvas || [];
        columns = ['Data', 'Estação', 'Milímetros'];
        data = registros.map((r: any) => [
          U.formatDate(r.data_chuva || r.data),
          r.ponto_nome || r.estacao || 'Geral',
          `${U.formatValue(r.milimetros)} mm`
        ]);
        rawData = registros.map((r: any) => ({
          Data: U.formatDate(r.data_chuva || r.data),
          Estacao: r.ponto_nome || r.estacao || 'Geral',
          Milimetros: U.parseDecimal(r.milimetros)
        }));
      }
      else {
        toast.error("Este relatório ainda está em desenvolvimento.");
        toast.dismiss(loadingToast);
        return;
      }

      const options = {
        title: titulo,
        filename: filename,
        farmName: fNome,
        subtitle: periodStr,
        logo: logo,
        columnStyles: relId === 'custo_abast' ? {
          1: { cellWidth: 17 }, // Bomba Inicial
          2: { cellWidth: 17 }, // Bomba Final
          3: { cellWidth: 17 }, // Estoque Final
          4: { cellWidth: 80 }, // Máquina (aumentado a pedido do usuario)
          8: { cellWidth: 19 }, // Média
          9: { cellWidth: 22 }  // Custo
        } : undefined
      };

      if (type === 'pdf') {
        await exportService.exportToPDF(columns, data, options);
      } else {
        exportService.exportToExcel(rawData, options);
      }

      toast.success(`${titulo} exportado com sucesso!`);
    } catch (error) {
      console.error('Erro na exportação:', error);
      toast.error("Erro ao gerar arquivo. Tente novamente.");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const filtrados = relatorios.filter(r => 
    r.titulo.toLowerCase().includes(search.toLowerCase()) || 
    r.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 p-4 pb-24 animate-in fade-in duration-300">
      <PageHeader setTela={setTela} title="Central de Relatórios" icon={FileText} colorClass="bg-indigo-700" badge="Beta" />

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

      <div className="bg-white border-2 border-indigo-100 p-4 rounded-xl shadow-sm">
          <h4 className="text-xs font-black text-indigo-700 uppercase mb-3 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtro de Período (Intervalo de Datas)
          </h4>
          <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Início</label>
                  <input 
                    type="date" 
                    value={dateStart} 
                    onChange={e => setDateStart(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm outline-none focus:border-indigo-500"
                  />
              </div>
              <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Fim</label>
                  <input 
                    type="date" 
                    value={dateEnd} 
                    onChange={e => setDateEnd(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm outline-none focus:border-indigo-500"
                  />
              </div>
          </div>
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
                  onClick={() => handleExport('pdf', rel.id, rel.titulo)}
                  className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button 
                  onClick={() => handleExport('excel', rel.id, rel.titulo)}
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
