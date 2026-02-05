import React, { useState, useMemo } from 'react';
import { ShoppingBag, Search, AlertTriangle, Plus, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { PageHeader } from '../components/ui/Shared';
import { U } from '../utils';

export default function EstoqueScreen() {
  const { state, ativos, dados, setTela } = useAppContext();
  const { userRole, permissions } = state;
  const rolePermissions = permissions?.[userRole || ''] || permissions?.['Operador'];
  
  const [search, setSearch] = useState('');

  // Lógica de cálculo de estoque para cada produto
  const estoqueProdutos = useMemo(() => {
    return (ativos.produtos || []).map((prod: any) => {
      // 1. Entradas (Compras)
      const entradas = (dados.compras || [])
        .filter((c: any) => c.produto === prod.nome)
        .reduce((acc: number, cur: any) => acc + U.parseDecimal(cur.litros || cur.quantidade), 0);
      
      // 2. Saídas (Recomendações)
      // Aplicações podem ter múltiplos itens. Precisamos verificar cada um.
      const saidas = (dados.recomendacoes || [])
        .reduce((acc: number, rec: any) => {
          if (rec.itens) {
            const qtdNoRec = rec.itens
              .filter((it: any) => it.produto === prod.nome)
              .reduce((accIt: number, curIt: any) => accIt + U.parseDecimal(curIt.dose), 0); // Simplificação: usando dose como qtd
            return acc + (qtdNoRec * U.parseDecimal(rec.area || 0)); // Multiplica dose pela área
          }
          return acc;
        }, 0);

      const saldo = entradas - saidas;
      const minimo = U.parseDecimal(prod.estoque_minimo);
      const critico = saldo <= minimo;

      return {
        ...prod,
        entradas,
        saidas,
        saldo,
        minimo,
        critico
      };
    });
  }, [ativos.produtos, dados.compras, dados.recomendacoes]);

  const filtrados = estoqueProdutos.filter((p: any) => 
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 p-4 pb-24 animate-in fade-in duration-300">
      <PageHeader setTela={setTela} title="Controle de Estoque" icon={ShoppingBag} colorClass="bg-blue-600" badge="Beta" />

      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar produto..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="w-full pl-9 pr-3 py-2 border-2 rounded-xl text-sm bg-white focus:border-blue-500 outline-none transition-all" 
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtrados.length === 0 && (
          <div className="text-center py-10 text-gray-400 italic">Nenhum produto em estoque.</div>
        )}
        
        {filtrados.map((item: any) => (
          <div key={item.id} className={`p-4 rounded-xl border-2 shadow-sm bg-white hover:border-blue-300 transition-all ${item.critico ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${item.critico ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-base">{item.nome}</h3>
                  <p className="text-xs text-gray-400">ID: {item.id}</p>
                </div>
              </div>
              {item.critico && (
                <div className="flex items-center gap-1 bg-red-600 text-white text-[10px] px-2 py-1 rounded-full font-bold animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> NÍVEL CRÍTICO
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="bg-gray-50 p-2 rounded-lg text-center">
                <p className="text-[9px] uppercase font-bold text-gray-400">Entradas</p>
                <p className="text-sm font-bold text-green-600 flex items-center justify-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" /> {U.formatInt(item.entradas)}
                </p>
              </div>
              <div className="bg-gray-50 p-2 rounded-lg text-center">
                <p className="text-[9px] uppercase font-bold text-gray-400">Saídas</p>
                <p className="text-sm font-bold text-red-600 flex items-center justify-center gap-0.5">
                  <ArrowDownRight className="w-3 h-3" /> {U.formatInt(item.saidas)}
                </p>
              </div>
              <div className={`p-2 rounded-lg text-center ${item.critico ? 'bg-red-100' : 'bg-blue-50'}`}>
                <p className="text-[9px] uppercase font-bold text-gray-400">Saldo Atual</p>
                <p className={`text-sm font-black ${item.critico ? 'text-red-700' : 'text-blue-700'}`}>
                  {U.formatInt(item.saldo)}
                </p>
              </div>
            </div>

            <div className={`mt-3 pt-3 border-t border-gray-100 flex ${rolePermissions?.actions?.estoque_compra === false ? 'justify-center' : 'justify-between'} items-center text-[10px]`}>
              <p className="text-gray-500 font-bold uppercase tracking-tighter">Estoque Mínimo: <span className="text-gray-700 font-black">{item.minimo}</span></p>
              {rolePermissions?.actions?.estoque_compra !== false && (
                  <button 
                    onClick={() => setTela('abastecimento')}
                    className="text-blue-600 font-black uppercase flex items-center gap-1 hover:underline"
                  >
                    Comprar <Plus className="w-3 h-3" />
                  </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
