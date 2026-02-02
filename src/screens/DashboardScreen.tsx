import React, { useMemo } from 'react';
import { FileCog, Search, Eye, Bell, CloudRain, Fuel, AlertTriangle, TrendingUp, Calendar, ArrowRight, Droplet, Plus, ArrowLeft, Utensils, Leaf, FolderOpen, Zap, Wrench } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { U } from '../data/utils';
import { APP_VERSION } from '../data/constants';

export default function DashboardScreen() { 
  const { os, dados, setTela, dispatch, ativos } = useAppContext();

  // 1. CÁLCULO DE KPIS (RESUMO)
  const kpis = useMemo(() => {
      const hoje = U.todayIso();
      const pendentes = os.filter((o:any) => o.status === 'Pendente').length;
      
      // Combustível Hoje
      const absHoje = (dados.abastecimentos || []).filter((a:any) => a.data === hoje);
      const litrosHoje = absHoje.reduce((acc:number, item:any) => acc + U.parseDecimal(item.qtd), 0);
      
      // Alertas Críticos (Estoque Diesel Baixo) - Puxando da configuração da fazenda via ativos.parametros
      const paramsEstoque = ativos.parametros?.estoque || {};
      const estoqueInicial = paramsEstoque.ajusteManual !== '' ? U.parseDecimal(paramsEstoque.ajusteManual) : 0;
      const estoqueMinimo = paramsEstoque.estoqueMinimo !== '' ? U.parseDecimal(paramsEstoque.estoqueMinimo) : 0;

      const estoqueDiesel = estoqueInicial 
                          + (dados.compras || []).reduce((s:number, i:any) => s + U.parseDecimal(i.litros), 0)
                          - (dados.abastecimentos || []).reduce((s:number, i:any) => s + U.parseDecimal(i.qtd), 0);
      const alertaEstoque = estoqueDiesel <= estoqueMinimo;

      // Refeições Hoje
      const refeicoesHoje = (dados.refeicoes || []).filter((r:any) => r.data === hoje).length;

      // Recomendações Hoje
      const recomHoje = (dados.recomendacoes || []).filter((r:any) => r.data === hoje).length;

      // Documentos Hoje
      const docsHoje = (dados.documentos || []).filter((d:any) => d.data === hoje).length;

      // Energia Hoje
      const energiaHoje = (dados.energia || []).filter((e:any) => e.data === hoje).length;

      // Chuvas Hoje
      const chuvasHoje = (dados.chuvas || []).filter((c:any) => c.data === hoje).length;
      
      // Alertas de Manutenção
      const alertPrevVal = ativos.parametros?.manutencao?.alertaPreventiva;
      const alertPrev = alertPrevVal !== '' ? U.parseDecimal(alertPrevVal) : 0;
      const maquinasVencidas = (ativos.maquinas || []).filter((m:any) => {
          const horimetroRevisao = U.parseDecimal(m.ultima_revisao || 0) + U.parseDecimal(m.intervalo_revisao || 0);
          if (horimetroRevisao <= 0) return false;
          
          const ultimoAbs = (dados.abastecimentos || []).filter((a:any) => a.maquina === m.nome).sort((a:any, b:any) => b.id - a.id)[0];
          const horimetroAtual = ultimoAbs ? U.parseDecimal(ultimoAbs.horimetroAtual) : U.parseDecimal(m.horimetro_inicial || 0);
          
          // Alerta se está nas últimas X horas configuradas
          return horimetroAtual >= (horimetroRevisao - alertPrev);
      }).length;

      // Alertas de Documentos (Máquinas ou Pessoas)
      const hojeData = new Date();
      const docsVencendo = [
          ...(ativos.maquinas || []).filter((m:any) => m.vencimento_doc && new Date(m.vencimento_doc) <= hojeData),
          // CNH removido do rastreio de Custo

      ].length;

      // Chuva Crítica (24h > 50mm por padrão)
      const chuvaCritica = (dados.chuvas || []).some((c:any) => c.data === hoje && U.parseDecimal(c.milimetros) >= 50);
      
      return { 
          pendentes, litrosHoje, alertaEstoque, estoqueDiesel, refeicoesHoje, recomHoje, 
          docsHoje, energiaHoje, chuvasHoje, maquinasVencidas, documentosVencendo: docsVencendo, chuvaCritica 
      };
  }, [os, dados, ativos]);

  // 2. TIMELINE UNIFICADA (OS + Abastecimentos + Chuvas)
  const timeline = useMemo(() => {
     let items = [];
     
     // Adiciona OS Recentes
     items.push(...os.map((o:any) => ({ 
         type: 'os', date: o.data_abertura || o.created_at, sortDate: new Date(o.data_abertura || o.created_at || 0).getTime(),
         title: `OS: ${o.modulo}`, desc: o.descricao, status: o.status, id: o.id 
     })));

     // Adiciona Abastecimentos Recentes
     items.push(...(dados.abastecimentos || []).map((a:any) => ({
         type: 'fuel', date: a.data_operacao || a.data, sortDate: new Date(a.data_operacao || a.data).getTime(),
         title: `Abastecimento`, desc: `${a.maquina} - ${a.qtd}L`, id: a.id
     })));

     // Adiciona Chuvas Recentes
     items.push(...(dados.chuvas || []).map((c:any) => ({
         type: 'rain', date: c.data_leitura || c.data, sortDate: new Date(c.data_leitura || c.data).getTime(),
         title: `Registro de Chuva`, desc: `${c.local}: ${c.milimetros}mm`, id: c.id
     })));

     // Ordena por data (mais recente primeiro) e pega top 10
     return items.sort((a,b) => b.sortDate - a.sortDate).slice(0, 10);
  }, [os, dados]);

  const cardStyle = "bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden active:scale-95 transition-all";

  return (
    <div className="space-y-6 p-4 pb-24 animate-in fade-in duration-500">
      
      {/* CABEÇALHO PADRONIZADO (Estilo PageHeader + Data) */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b">
          <div>
            <div className="flex items-center gap-2">
                <FileCog className="w-7 h-7 text-yellow-500" />
                <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
            </div>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide flex items-center gap-1 ml-9 mt-0.5">
                <Calendar className="w-3 h-3"/> {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
            </p>
          </div>
          <button onClick={() => setTela('principal')} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-yellow-600 bg-gray-100 px-3 py-1.5 rounded-full transition-colors active:scale-95 shadow-sm">
              <ArrowLeft className="w-3 h-3" /> Voltar
          </button>
      </div>

      {/* 1. KPIs DESTAQUE */}
      <div className="grid grid-cols-2 gap-3">
          {/* OS PENDENTES */}
          <div className={`${cardStyle} border-l-4 border-l-yellow-300 cursor-pointer hover:shadow-md active:scale-95`} onClick={() => setTela('os')}>
              <div className="flex justify-between items-start">
                  <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600"><FileCog className="w-5 h-5"/></div>
                  <span className="text-2xl font-black text-gray-800">{kpis.pendentes}</span>
              </div>
              <p className="text-xs font-bold text-gray-500 mt-2">OS Pendentes</p>
              <p className="text-[10px] text-gray-400">Clique para gerenciar</p>
          </div>

          {/* REFEIÇÕES HOJE */}
          <div className={`${cardStyle} border-l-4 border-l-orange-500 cursor-pointer hover:shadow-md active:scale-95`} onClick={() => setTela('refeicoes')}>
              <div className="flex justify-between items-start">
                  <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><Utensils className="w-5 h-5"/></div>
                  <span className="text-2xl font-black text-gray-800">{kpis.refeicoesHoje}</span>
              </div>
              <p className="text-xs font-bold text-gray-500 mt-2">Refeições Hoje</p>
              <p className="text-[10px] text-gray-400">Clique para lançar</p>
          </div>

          {/* COMBUSTÍVEL HOJE */}
          <div className={`${cardStyle} border-l-4 border-l-red-500 cursor-pointer hover:shadow-md active:scale-95`} onClick={() => setTela('abastecimento')}>
              <div className="flex justify-between items-start">
                  <div className="p-2 bg-red-100 rounded-lg text-red-600"><Fuel className="w-5 h-5"/></div>
                  <span className="text-xl font-black text-gray-800">{kpis.litrosHoje}<span className="text-sm text-gray-400 font-normal">L</span></span>
              </div>
              <p className="text-xs font-bold text-gray-500 mt-2">Abastecido Hoje</p>
              <p className="text-[10px] text-gray-400">{kpis.alertaEstoque ? <span className="text-red-600 font-black flex gap-1 items-center"><AlertTriangle className="w-3 h-3"/> EST. CRÍTICO</span> : 'Estoque Normal'}</p>
          </div>

          {/* RECOMENDAÇÕES HOJE */}
          <div className={`${cardStyle} border-l-4 border-l-green-500 cursor-pointer hover:shadow-md active:scale-95`} onClick={() => setTela('recomendacoes')}>
              <div className="flex justify-between items-start">
                  <div className="p-2 bg-green-100 rounded-lg text-green-600"><Leaf className="w-5 h-5"/></div>
                  <span className="text-2xl font-black text-gray-800">{kpis.recomHoje}</span>
              </div>
              <p className="text-xs font-bold text-gray-500 mt-2">Recomendações</p>
              <p className="text-[10px] text-gray-400">Receituário de hoje</p>
          </div>

          {/* DOCUMENTOS HOJE (CONDICIONAL) */}
          {kpis.docsHoje > 0 && (
            <div className={`${cardStyle} border-l-4 border-l-purple-500 cursor-pointer hover:shadow-md active:scale-95`} onClick={() => setTela('docs')}>
                <div className="flex justify-between items-start">
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><FolderOpen className="w-5 h-5"/></div>
                    <span className="text-2xl font-black text-gray-800">{kpis.docsHoje}</span>
                </div>
                <p className="text-xs font-bold text-gray-500 mt-2">Novos Docs</p>
                <p className="text-[10px] text-gray-400">NF e Tramitações</p>
            </div>
          )}

          {/* ENERGIA HOJE (CONDICIONAL) */}
          {kpis.energiaHoje > 0 && (
            <div className={`${cardStyle} border-l-4 border-l-yellow-300 cursor-pointer hover:shadow-md active:scale-95`} onClick={() => setTela('energia')}>
                <div className="flex justify-between items-start">
                    <div className="p-2 bg-yellow-100 rounded-lg text-yellow-500"><Zap className="w-5 h-5"/></div>
                    <span className="text-2xl font-black text-gray-800">{kpis.energiaHoje}</span>
                </div>
                <p className="text-xs font-bold text-gray-500 mt-2">Leituras Energia</p>
                <p className="text-[10px] text-gray-400">Registros do dia</p>
            </div>
          )}

          {/* CHUVAS HOJE (CONDICIONAL) */}
          {kpis.chuvasHoje > 0 && (
            <div className={`${cardStyle} border-l-4 border-l-sky-400 cursor-pointer hover:shadow-md active:scale-95`} onClick={() => setTela('chuvas')}>
                <div className="flex justify-between items-start">
                    <div className="p-2 bg-sky-100 rounded-lg text-sky-600"><CloudRain className="w-5 h-5"/></div>
                    <span className="text-2xl font-black text-gray-800">{kpis.chuvasHoje}</span>
                </div>
                <p className="text-xs font-bold text-gray-500 mt-2">Registros de Chuva</p>
                <p className="text-[10px] text-gray-400">Pluviometria de hoje</p>
            </div>
          )}

      </div>

      {/* 1.5 ALERTAS CRÍTICOS (CARDS COLORIDOS) */}
      {(kpis.maquinasVencidas > 0 || kpis.documentosVencendo > 0 || kpis.chuvaCritica) && (
        <div className="grid grid-cols-1 gap-3">
            {kpis.maquinasVencidas > 0 && (
                <div onClick={() => setTela('manutencao')} className="bg-red-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between animate-pulse cursor-pointer">
                    <div className="flex items-center gap-3">
                        <Wrench className="w-6 h-6" />
                        <div>
                            <p className="text-xs font-bold uppercase opacity-80">Manutenção Vencida</p>
                            <p className="text-lg font-black">{kpis.maquinasVencidas} {kpis.maquinasVencidas === 1 ? 'Máquina' : 'Máquinas'}</p>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 opacity-50" />
                </div>
            )}

            {kpis.documentosVencendo > 0 && (
                <div onClick={() => setTela('docs')} className="bg-amber-500 text-white p-4 rounded-xl shadow-lg flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                        <FolderOpen className="w-6 h-6" />
                        <div>
                            <p className="text-xs font-bold uppercase opacity-80">Documentos Vencidos</p>
                            <p className="text-lg font-black">{kpis.documentosVencendo} Pendências</p>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 opacity-50" />
                </div>
            )}

            {kpis.chuvaCritica && (
                <div onClick={() => setTela('chuvas')} className="bg-blue-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CloudRain className="w-6 h-6" />
                        <div>
                            <p className="text-xs font-bold uppercase opacity-80">Volume Crítico de Chuva</p>
                            <p className="text-lg font-black">Alerta Pluviométrico</p>
                        </div>
                    </div>
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                </div>
            )}
        </div>
      )}

      {/* 2. TIMELINE DE ATIVIDADES */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-yellow-500"/> Atividades Recentes
          </h2>
          
          <div className="space-y-0 relative border-l-2 border-gray-100 ml-3 pb-2">
              {timeline.map((item, idx) => (
                  <div key={`${item.type}-${item.id}`} className="mb-6 ml-6 relative group cursor-pointer" 
                       onClick={() => {
                           if (item.type === 'os') { 
                               const fullOS = os.find((o:any) => o.id === item.id);
                               if (fullOS) dispatch({ type: ACTIONS.SET_SELECTED_OS, os: fullOS });
                           }
                       }}>
                      {/* Ícone na Linha do Tempo */}
                      <span className={`absolute -left-[33px] top-0 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-sm z-10 
                          ${item.type === 'os' && item.status === 'Pendente' ? 'bg-yellow-100 text-yellow-600' : 
                            item.type === 'os' ? 'bg-green-100 text-green-600' : 
                            item.type === 'fuel' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                          {item.type === 'os' ? <FileCog className="w-4 h-4"/> : 
                           item.type === 'fuel' ? <Fuel className="w-4 h-4"/> : <CloudRain className="w-4 h-4"/>}
                      </span>
                      
                      {/* Conteúdo */}
                      <div>
                          <div className="flex justify-between items-center mb-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full 
                                  ${item.type === 'os' ? 'bg-gray-100 text-gray-600' : 
                                    item.type === 'fuel' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                  {item.type === 'os' ? item.status : item.type === 'fuel' ? 'Consumo' : 'Clima'}
                              </span>
                              <span className="text-[10px] text-gray-400">{item.date ? U.formatDate(item.date).slice(0,5) : ''}</span>
                          </div>
                          <h3 className="text-sm font-bold text-gray-800">{item.title}</h3>
                          <p className="text-xs text-gray-500 line-clamp-1">{item.desc}</p>
                      </div>
                  </div>
              ))}
              
              {timeline.length === 0 && (
                  <div className="ml-6 py-4 text-center">
                      <p className="text-sm text-gray-400 italic">Nenhuma atividade recente.</p>
                  </div>
              )}
          </div>
          
          <button onClick={() => setTela('graficos')} className="w-full py-2 text-xs font-bold text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
              Ver Histórico Completo em Gráficos
          </button>
      </div>

      {/* Rodapé Versão */}
      <div className="text-center pb-6">
          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">AgroVisão Enterprise {APP_VERSION}</p>
      </div>
    </div>
  );
}