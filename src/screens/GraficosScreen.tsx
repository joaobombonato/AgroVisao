import React, { useMemo, useState, useEffect } from 'react';
import { ChartNoAxesCombined, Fuel, CloudRain, FileCog, Calendar, Filter, ArrowLeft, Plus, Save, Trash2, Download, BarChart3, LineChart, PieChart, X } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { U } from '../data/utils';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';

// Componente Genérico de Card
const ChartCard = ({ title, icon: Icon, color, children }: any) => (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
            <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-700">{title}</h3>
        </div>
        {children}
    </div>
);

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
      (dados.abastecimentos || []).forEach((a:any) => {
          const qtd = U.parseDecimal(a.qtd);
          if (qtd > 0) map[a.maquina] = (map[a.maquina] || 0) + qtd;
      });
      
      const sorted = Object.entries(map)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5);
      
      const maxVal = Math.max(...sorted.map(([,v]) => v), 1); 

      return { data: sorted, max: maxVal };
  }, [dados.abastecimentos]);

  // 2. DADOS: CHUVAS (Últimos 7 dias)
  const chartChuvas = useMemo(() => {
      const today = new Date();
      const last7Days = Array.from({length: 7}, (_, i) => {
          const d = new Date(today);
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
      });

      const data = last7Days.map(date => {
          const totalDia = (dados.chuvas || [])
              .filter((c:any) => c.data === date)
              .reduce((acc:number, item:any) => acc + U.parseDecimal(item.milimetros), 0);
          return { date, val: totalDia, label: U.formatDate(date).slice(0,5) };
      });

      const maxVal = Math.max(...data.map(d => d.val), 10); 

      return { data, max: maxVal };
  }, [dados.chuvas]);

  // 3. DADOS: STATUS OS (DONUT)
  const chartOS = useMemo(() => {
     const total = os.length;
     if (total === 0) return { pend: 0, conf: 0, canc: 0, total: 0, pPend: 0, pConf: 0, pCanc: 0, C: 251.2 };
     
     const pend = os.filter((o:any) => o.status === 'Pendente').length;
     const conf = os.filter((o:any) => o.status === 'Confirmado').length;
     const canc = os.filter((o:any) => o.status === 'Cancelado').length;
     
     const C = 251.2;
     const pPend = (pend / total) * C;
     const pConf = (conf / total) * C;
     const pCanc = (canc / total) * C;

     return { pend, conf, canc, total, pPend, pConf, pCanc, C };
  }, [os]);

  return (
    <div className="space-y-6 p-4 pb-24 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6 pb-2 border-b">
         <div>
             <h1 className="text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Gráficos & Indicadores</h1>
             <p className="text-xs text-gray-500 font-medium">Análise de performance financeira e operacional</p>
         </div>
         <button onClick={() => setTela('principal')} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-purple-600 bg-gray-100 px-3 py-1.5 rounded-full transition-colors active:scale-95 shadow-sm">
             <ArrowLeft className="w-3 h-3" /> Voltar
         </button>
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
                      const source = [...(dados.abastecimentos || []), ...(dados.compras || []), ...(dados.energia || [])];
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
      {showEditor && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                  <div className="p-4 border-b flex justify-between items-center bg-purple-50 rounded-t-2xl">
                      <h3 className="font-black text-purple-800 flex items-center gap-2"><Plus className="w-5 h-5"/> Criar Indicador BI</h3>
                      <button onClick={() => setShowEditor(false)} className="text-purple-800"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="p-5 space-y-4">
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Nome do Indicador</label>
                          <input type="text" className="w-full border-2 p-2 rounded-lg focus:border-purple-500 outline-none font-bold" placeholder="Ex: Gasto por Máquina" value={newChart.name} onChange={e => setNewChart({...newChart, name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Eixo X (Base)</label>
                            <select className="w-full border-2 p-2 rounded-lg text-sm font-bold bg-gray-50" value={newChart.eixoX} onChange={e => setNewChart({...newChart, eixoX: e.target.value})}>
                                <option>Data</option>
                                <option>Máquina</option>
                                <option>Centro de Custo</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Eixo Y (Valor)</label>
                            <select className="w-full border-2 p-2 rounded-lg text-sm font-bold bg-gray-50" value={newChart.eixoY} onChange={e => setNewChart({...newChart, eixoY: e.target.value})}>
                                <option>Valor R$</option>
                                <option>Litros</option>
                                <option>Consumo (kwh/L)</option>
                            </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Tipo de Visualização</label>
                          <div className="grid grid-cols-3 gap-2">
                              {['Barra', 'Linha', 'Pizza'].map(t => (
                                  <button key={t} onClick={() => setNewChart({...newChart, tipo: t})} className={`py-2 rounded-lg border-2 text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${newChart.tipo === t ? 'border-purple-600 bg-purple-50 text-purple-600' : 'border-gray-100 text-gray-400'}`}>
                                      {t === 'Barra' && <BarChart3 className="w-4 h-4"/>}
                                      {t === 'Linha' && <LineChart className="w-4 h-4"/>}
                                      {t === 'Pizza' && <PieChart className="w-4 h-4"/>}
                                      {t}
                                  </button>
                              ))}
                          </div>
                      </div>
                      <button onClick={saveChart} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                          <Save className="w-5 h-5"/> Salvar no Dashboard
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="text-center pt-8 border-t-2 border-gray-100">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Plataforma AgroBI v1.0</p>
          <p className="text-[9px] text-gray-300 italic mt-1">Análise de performance e inteligência operacional</p>
      </div>
    </div>
  );
}
