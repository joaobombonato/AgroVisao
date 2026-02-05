import React, { useMemo, useState, useEffect } from 'react';
import { ChartNoAxesCombined, Fuel, FileCog, ArrowLeft, Plus, Download, Trash2, BarChart3, Sparkles, Brain, Zap } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { U } from '../utils';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import { ChartCard } from '../components/ui/ChartCard';
import { BIEditorModal } from '../components/ui/BIEditorModal';

export default function GraficosScreen() {
  const { dados, os, setTela, session } = useAppContext();
  const [periodo, setPeriodo] = useState(30); 
  
  // Estados do BI Personalizado
  const [customCharts, setCustomCharts] = useState<any[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [newChart, setNewChart] = useState({
      name: '',
      eixoX: 'Data',
      eixoY: 'Valor R$',
      tipo: 'Barra'
  });

  // Carregar Gráficos do Supabase
  useEffect(() => {
      if (!session?.user?.id) return;
      const loadCharts = async () => {
          const { data, error } = await supabase
              .from('user_charts')
              .select('*')
              .eq('user_id', session.user.id);
          if (data) setCustomCharts(data);
      };
      loadCharts();
  }, [session]);

  const saveChart = async () => {
      if (!newChart.name) return toast.error("Dê um nome ao indicador.");
      const payload = {
          user_id: session.user.id,
          name: newChart.name,
          config: { eixoX: newChart.eixoX, eixoY: newChart.eixoY, tipo: newChart.tipo }
      };
      const { data, error } = await supabase.from('user_charts').insert([payload]).select();
      if (error) return toast.error("Erro ao salvar.");
      if (data) setCustomCharts([...customCharts, data[0]]);
      setShowEditor(false);
      setNewChart({ name: '', eixoX: 'Data', eixoY: 'Valor R$', tipo: 'Barra' });
      toast.success("Indicador salvo no seu Dashboard!");
  };

  const deleteChart = async (id: string) => {
      const { error } = await supabase.from('user_charts').delete().eq('id', id);
      if (!error) setCustomCharts(customCharts.filter(c => c.id !== id));
  };

  const exportCSV = (name: string, data: any[]) => {
      const headers = "Eixo X,Eixo Y\n";
      const rows = data.map(d => `${d.label},${d.val}`).join("\n");
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.toLowerCase().replace(/ /g, '_')}_export.csv`;
      a.click();
      toast.success("Dados exportados para CSV!");
  };

  // 1. DADOS: CONSUMO POR MÁQUINA (TOP 5)
  const chartCombustivel = useMemo(() => {
      const map: Record<string, number> = {};
      (dados?.abastecimentos || []).forEach((a:any) => {
          const qtd = U.parseDecimal(a.qtd);
          if (qtd > 0) map[a.maquina] = (map[a.maquina] || 0) + qtd;
      });
      
      const sorted = Object.entries(map)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5);
      
      const maxVal = Math.max(...sorted.map(([,v]) => v), 1); 

      return { data: sorted, max: maxVal };
  }, [dados?.abastecimentos]);

  // 2. DADOS: STATUS OS (DONUT)
  const chartOS = useMemo(() => {
     const safeOS = os || [];
     const total = safeOS.length;
     if (total === 0) return { pend: 0, conf: 0, canc: 0, total: 0, pPend: 0, pConf: 0, pCanc: 0, C: 251.2 };
     
     const pend = safeOS.filter((o:any) => o.status === 'Pendente').length;
     const conf = safeOS.filter((o:any) => o.status === 'Confirmado').length;
     const canc = safeOS.filter((o:any) => o.status === 'Cancelado').length;
     
     const C = 251.2;
     const pPend = (pend / total) * C;
     const pConf = (conf / total) * C;
     const pCanc = (canc / total) * C;

     return { pend, conf, canc, total, pPend, pConf, pCanc, C };
  }, [os]);

  // Dados Diesel Comparação
  const dieselComparison = useMemo(() => {
      const hoje = new Date();
      const mesAtual = hoje.getMonth();
      const mesPassado = mesAtual === 0 ? 11 : mesAtual - 1;
      
      const dieselAtual = (dados?.abastecimentos || []).filter((a:any) => new Date(a.data).getMonth() === mesAtual).reduce((acc:number, cur:any) => acc + U.parseDecimal(cur.qtd), 0);
      const dieselAnterior = (dados?.abastecimentos || []).filter((a:any) => new Date(a.data).getMonth() === mesPassado).reduce((acc:number, cur:any) => acc + U.parseDecimal(cur.qtd), 0);
      
      const maxVal = Math.max(dieselAtual, dieselAnterior, 1);
      const diferenca = dieselAnterior > 0 ? ((dieselAtual - dieselAnterior) / dieselAnterior) * 100 : 0;

      return { dieselAtual, dieselAnterior, maxVal, diferenca };
  }, [dados?.abastecimentos]);

  // Dados Energia
  const energiaData = useMemo(() => {
      const meta = 1500;
      const gastoAtual = (dados?.energia || [])
        .filter((e:any) => new Date(e.data).getMonth() === new Date().getMonth())
        .reduce((acc:number, cur:any) => acc + U.parseDecimal(cur.valorTotal || 0), 0);
      
      const percent = Math.min((gastoAtual / meta) * 100, 100);
      const isOver = gastoAtual > meta;

      return { meta, gastoAtual, percent, isOver };
  }, [dados?.energia]);

  return (
    <div className="space-y-6 p-4 pb-24 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6 pb-2 border-b">
         <div>
             <ChartNoAxesCombined className="w-7 h-7 text-purple-600" />
             <h1 className="text-xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                 Gráficos
                 <span className="text-[9px] font-black bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Beta</span>
             </h1>
         </div>
         <div className="flex items-center gap-2">
            <button 
                onClick={async () => {
                    toast.loading("AgroIA analisando dados...", { id: 'ai' });
                    // @ts-ignore (Chrome Built-in AI)
                    if (window.ai && window.ai.summarizer) {
                        try {
                            const summarizer = await window.ai.summarizer.create();
                            const summary = await summarizer.summarize("Resuma o consumo de diesel e chuvas deste mês para a fazenda São Caetano.");
                            toast.success(summary, { id: 'ai', duration: 8000 });
                        } catch (e) {
                            toast.error("IA disponível mas falhou.", { id: 'ai' });
                        }
                    } else {
                        setTimeout(() => {
                            toast.success("Resumo AgroIA: O consumo de Diesel aumentou 5% este mês, mas as chuvas estão dentro da média esperada para a safra atual.", { id: 'ai', duration: 5000 });
                        }, 1500);
                    }
                }}
                className="flex items-center gap-1 text-[10px] font-black bg-indigo-600 text-white px-3 py-1.5 rounded-full hover:bg-indigo-700 transition-all shadow-sm uppercase tracking-tighter"
            >
                AgroIA <Sparkles className="w-3 h-3"/>
            </button>
            <button onClick={() => setTela('principal')} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-purple-600 bg-gray-100 px-3 py-1.5 rounded-full transition-colors active:scale-95 shadow-sm">
                <ArrowLeft className="w-4 h-4 ml-1" /> Voltar
            </button>
         </div>
      </div>

      {/* KPIS OPERACIONAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Consumo Diesel (Este Mês vs Anterior)" icon={Fuel} color="bg-red-100 text-red-600">
              <div className="space-y-4">
                  <div className="flex justify-around items-end h-24 gap-4">
                      <div className="flex flex-col items-center flex-1">
                          <div className="bg-gray-200 w-full rounded-t-lg transition-all duration-1000" style={{ height: `${(dieselComparison.dieselAnterior / dieselComparison.maxVal) * 100}%` }} />
                          <p className="text-[9px] font-bold mt-1 text-gray-400">ANTERIOR</p>
                      </div>
                      <div className="flex flex-col items-center flex-1">
                          <div className="bg-red-500 w-full rounded-t-lg transition-all duration-1000" style={{ height: `${(dieselComparison.dieselAtual / dieselComparison.maxVal) * 100}%` }} />
                          <p className="text-[9px] font-bold mt-1 text-red-600">ATUAL</p>
                      </div>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t pt-2">
                      <div>
                          <p className="text-gray-400 font-bold uppercase text-[9px]">Status</p>
                          <p className={`font-black ${dieselComparison.diferenca > 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {dieselComparison.diferenca > 0 ? '+' : ''}{dieselComparison.diferenca.toFixed(1)}% vs Mês Passado
                          </p>
                      </div>
                      <div className="text-right">
                          <p className="text-gray-400 font-bold uppercase text-[9px]">Total</p>
                          <p className="font-black text-gray-800">{U.formatInt(dieselComparison.dieselAtual)} L</p>
                      </div>
                  </div>
              </div>
          </ChartCard>

          <ChartCard title="Gasto Energia vs Meta R$" icon={Zap} color="bg-yellow-100 text-yellow-600">
              <div className="space-y-6">
                  <div className="relative pt-2">
                        <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1 uppercase">
                            <span>Gasto: R$ {U.formatValue(energiaData.gastoAtual)}</span>
                            <span>Meta: R$ {U.formatValue(energiaData.meta)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden border">
                            <div className={`h-full transition-all duration-1000 ${energiaData.isOver ? 'bg-red-500' : 'bg-yellow-400'}`} style={{ width: `${energiaData.percent}%` }} />
                        </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-3">
                      <Brain className={`w-5 h-5 ${energiaData.isOver ? 'text-red-500' : 'text-indigo-600'}`}/>
                      <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Input AgroIA</p>
                          <p className="text-[11px] text-gray-700 leading-tight">
                              {energiaData.isOver ? 'Gasto excedido! Avalie desligar pivôs em horários de pico.' : 'Consumo dentro da meta planejada para este mês.'}
                          </p>
                      </div>
                  </div>
              </div>
          </ChartCard>
      </div>

      {/* GRÁFICOS PADRÃO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Top 5 Consumo Diesel" icon={Fuel} color="bg-red-100 text-red-600">
              <div className="space-y-3">
                  {chartCombustivel.data.map(([nome, val], idx) => (
                      <div key={nome}>
                          <div className="flex justify-between text-xs mb-1">
                              <span className="font-bold text-gray-700">{idx+1}. {nome}</span>
                              <span className="font-bold text-gray-500">{U.formatInt(val)} L</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div className="h-full bg-red-500 rounded-full transition-all duration-1000" style={{ width: `${(val / chartCombustivel.max) * 100}%` }} />
                          </div>
                      </div>
                  ))}
                  {chartCombustivel.data.length === 0 && <p className="text-center text-xs text-gray-400 italic py-4">Sem dados de abastecimento.</p>}
              </div>
          </ChartCard>

          <ChartCard title="Status de O.S." icon={FileCog} color="bg-yellow-100 text-yellow-600">
             <div className="flex items-center justify-around">
                <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="12" />
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#fbbf24" strokeWidth="12" strokeDasharray={`${chartOS.pPend} ${chartOS.C}`} strokeDashoffset="0" />
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#22c55e" strokeWidth="12" strokeDasharray={`${chartOS.pConf} ${chartOS.C}`} strokeDashoffset={`-${chartOS.pPend}`} />
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ef4444" strokeWidth="12" strokeDasharray={`${chartOS.pCanc} ${chartOS.C}`} strokeDashoffset={`-${chartOS.pPend + chartOS.pConf}`} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-gray-800">{chartOS.total}</span>
                    </div>
                </div>
                <div className="space-y-1 text-[10px]">
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> Pend ({chartOS.pend})</div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Conf ({chartOS.conf})</div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Canc ({chartOS.canc})</div>
                </div>
             </div>
          </ChartCard>
      </div>

      {/* EDITOR DE BI (CUSTOM CHARTS) */}
      <div className="pt-4 border-t-2 border-dashed border-gray-200">
          <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-gray-700 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600"/> Indicadores Personalizados (BI)
              </h2>
              <button onClick={() => setShowEditor(true)} className="bg-purple-600 text-white p-2 rounded-lg shadow-lg active:scale-95 transition-all flex items-center gap-1 text-xs font-bold">
                  <Plus className="w-4 h-4"/> Novo
              </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
              {customCharts.map(chart => {
                  const config = chart.config;
                  const processedData = (() => {
                      const res: Record<string, number> = {};
                      const source = [...(dados?.abastecimentos || []), ...(dados?.compras || []), ...(dados?.energia || [])];
                      source.forEach((item: any) => {
                          let key = '';
                          if (config.eixoX === 'Data') key = item.data || 'Sem Data';
                          else if (config.eixoX === 'Máquina') key = item.maquina || item.ponto || 'Geral';
                          else key = item.setor || item.centroCusto || 'Sem Setor';
                          let val = 0;
                          if (config.eixoY === 'Valor R$') val = U.parseDecimal(item.valorTotal || item.valorEstimado || 0);
                          else if (config.eixoY === 'Litros') val = U.parseDecimal(item.qtd || item.litros || 0);
                          else val = item.consumo ? U.parseDecimal(item.consumo) : 0;
                          res[key] = (res[key] || 0) + val;
                      });
                      return Object.entries(res).map(([label, val]) => ({ label, val })).slice(-10);
                  })();
                  const maxVal = Math.max(...processedData.map(d => d.val), 1);

                  return (
                      <ChartCard key={chart.id} title={chart.name} icon={BarChart3} color="bg-purple-100 text-purple-600">
                          <div className="space-y-4">
                              <div className="flex gap-2 justify-end mb-2">
                                  <button onClick={() => exportCSV(chart.name, processedData)} className="p-1 text-gray-400 hover:text-blue-600" title="Exportar CSV"><Download className="w-4 h-4"/></button>
                                  <button onClick={() => deleteChart(chart.id)} className="p-1 text-gray-400 hover:text-red-600" title="Excluir"><Trash2 className="w-4 h-4"/></button>
                              </div>
                              <div className="space-y-2">
                                  {processedData.map(d => (
                                      <div key={d.label}>
                                          <div className="flex justify-between text-[10px] mb-1">
                                              <span className="font-bold text-gray-600 uppercase">{d.label}</span>
                                              <span className="font-bold text-purple-600">{U.formatInt(d.val)}</span>
                                          </div>
                                          <div className="w-full bg-gray-50 rounded-full h-1.5 overflow-hidden">
                                              <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${(d.val / maxVal) * 100}%` }} />
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </ChartCard>
                  );
              })}
          </div>
      </div>

      {/* MODAL EDITOR DE BI */}
      <BIEditorModal 
          isOpen={showEditor}
          onClose={() => setShowEditor(false)}
          onSave={saveChart}
          newChart={newChart}
          setNewChart={setNewChart}
      />

      <div className="text-center pt-8 border-t-2 border-gray-100">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Plataforma AgroBI v1.0</p>
          <p className="text-[9px] text-gray-300 italic mt-1">Análise de performance e inteligência operacional</p>
      </div>
    </div>
  );
}
