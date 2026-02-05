import React, { useState, useMemo } from 'react';
import { Wrench, Search, AlertTriangle, CheckCircle, Clock, Eye } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { PageHeader } from '../components/ui/Shared';
import { U } from '../utils';

export default function ManutencaoScreen() {
  const { ativos, dados, setTela } = useAppContext();
  const [search, setSearch] = useState('');

  // Lógica para determinar o status de cada máquina
  const maquinasStatus = useMemo(() => {
    return (ativos.maquinas || []).map((maq: any) => {
      // 1. Busca o horímetro atual (Usa abastecimento ou o inicial do cadastro)
      const abastecimentos = (dados.abastecimentos || []).filter((a: any) => a.maquina === maq.nome);
      const ultimoAbastecimento = abastecimentos.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];
      
      const horimetroAtual = ultimoAbastecimento 
        ? U.parseDecimal(ultimoAbastecimento.horimetroAtual) 
        : U.parseDecimal(maq.horimetro_inicial);
      
      // 2. Calcula a próxima revisão: Última + Intervalo
      const horimetroRevisao = U.parseDecimal(maq.ultima_revisao) + U.parseDecimal(maq.intervalo_revisao);
      
      const horasRestantes = horimetroRevisao - horimetroAtual;
      const status = horimetroRevisao === 0 ? 'Regular' : (horasRestantes <= 0 ? 'Vencida' : horasRestantes <= 50 ? 'Alerta' : 'Regular');

      return {
        ...maq,
        horimetroAtual,
        horimetroRevisao,
        horasRestantes,
        status
      };
    });
  }, [ativos.maquinas, dados.abastecimentos]);

  const filtradas = maquinasStatus.filter((m: any) => 
    m.nome.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusStyle = (s: string) => {
    switch(s) {
      case 'Vencida': return 'border-red-500 bg-red-50 text-red-700';
      case 'Alerta': return 'border-yellow-500 bg-yellow-50 text-yellow-700';
      default: return 'border-green-500 bg-green-50 text-green-700';
    }
  };

  const getStatusBadge = (s: string) => {
    switch(s) {
      case 'Vencida': return <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">VENCIDA</span>;
      case 'Alerta': return <span className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">ALERTA</span>;
      default: return <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">EM DIA</span>;
    }
  };

  return (
    <div className="space-y-4 p-4 pb-24 animate-in fade-in duration-300">
      <PageHeader setTela={setTela} title="Manutenção" icon={Wrench} colorClass="bg-red-600" badge="Beta" />

      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar máquina..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="w-full pl-9 pr-3 py-2 border-2 rounded-xl text-sm bg-white focus:border-red-500 outline-none transition-all" 
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtradas.length === 0 && (
          <div className="text-center py-10 text-gray-400 italic">Nenhuma máquina encontrada.</div>
        )}
        
        {filtradas.map((maq: any) => (
          <div key={maq.id} className={`p-4 rounded-xl border-2 shadow-sm ${getStatusStyle(maq.status)} transition-all`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-gray-800 text-base">{maq.nome}</h3>
                <p className="text-xs text-gray-500 mt-0.5 italic">ID: {maq.id}</p>
              </div>
              {getStatusBadge(maq.status)}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3 py-3 border-y border-black/5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 opacity-50" />
                <div>
                  <p className="text-[10px] uppercase font-bold opacity-70">Última Leitura</p>
                  <p className="text-sm font-black">{U.formatInt(maq.horimetroAtual)} h</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 opacity-50" />
                <div>
                  <p className="text-[10px] uppercase font-bold opacity-70">Meta Revisão</p>
                  <p className="text-sm font-black">{U.formatInt(maq.horimetroRevisao)} h</p>
                </div>
              </div>
            </div>

            <div className="mt-3 flex justify-between items-center">
              <div className="text-xs">
                {maq.horasRestantes <= 0 ? (
                  <p className="font-bold text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Excedeu: {Math.abs(maq.horasRestantes)}h
                  </p>
                ) : (
                  <p className="font-bold text-gray-600">Faltam: {maq.horasRestantes}h</p>
                )}
              </div>
              
              <button className="flex items-center gap-1 text-[10px] font-black uppercase text-gray-400 hover:text-red-600 transition-colors">
                Histórico <Eye className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
