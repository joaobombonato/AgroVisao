import React from 'react';
import { Leaf, Check, ScrollText } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { PageHeader } from '../../../components/ui/Shared';
import { U } from '../../../utils';
import { useRecomendacaoForm } from '../hooks/useRecomendacaoForm';
import RecHeaderFields from '../components/RecHeaderFields';
import RecItemForm from '../components/RecItemForm';
import RecCartTable from '../components/RecCartTable';
import RecHistoryList from '../components/RecHistoryList';

// ==========================================
// TELA PRINCIPAL (MOVIMENTADA PARA O MÓDULO)
// ==========================================
export default function RecomendacoesScreen() {
  const { state, setTela } = useAppContext();
  const { userRole, permissions } = state;
  const rolePermissions = permissions?.[userRole || ''] || permissions?.['Operador'];
  
  const form = useRecomendacaoForm();

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Recomendações" icon={Leaf} colorClass="bg-green-500" />
      
      {rolePermissions?.actions?.recomendacao_criar === false ? (
        <div className="bg-amber-50 rounded-lg border-2 border-amber-200 p-8 shadow-sm text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ScrollText className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-amber-900 font-bold mb-1">Acesso Direcionado</h3>
            <p className="text-sm text-amber-700 leading-relaxed">
                Neste nível de acesso (**Operador**), você pode apenas **consultar e compartilhar** as recomendações já registradas.
            </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border-2 p-4 shadow-sm space-y-4">
            <h2 className="font-bold border-b pb-2 mb-3 text-gray-700 flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-green-500"/> Nova Receita Agronômica
            </h2>
            
            {/* CABEÇALHO (SAFRA, TALHÃO, CULTURA) */}
            <RecHeaderFields 
                header={form.header}
                setHeader={form.setHeader}
                ativos={form.ativos}
                handleTalhaoChange={form.handleTalhaoChange}
                handleOperacaoChange={form.handleOperacaoChange}
            />

            {/* ADICIONAR PRODUTOS (COM COMPOSIÇÃO DE CALDA) */}
            <RecItemForm 
                item={form.item}
                setItem={form.setItem}
                classesFiltradas={form.classesFiltradas}
                produtosFiltrados={form.produtosFiltrados}
                handleAddItem={form.handleAddItem}
            />

            {/* LISTA DE ITENS ADICIONADOS (CARRINHO) */}
            <RecCartTable 
                itens={form.itensAdicionados}
                onRemove={form.handleRemoveItem}
            />

            {/* BOTÃO FINALIZAR */}
            {form.itensAdicionados.length > 0 && (
                <button 
                    onClick={form.handleFinish} 
                    className="w-full bg-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-md hover:bg-green-800 transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                    <Check className="w-6 h-6"/> Registrar Recomendação ({form.itensAdicionados.length} insumos)
                </button>
            )}
        </div>
      )}

      {/* LANÇAMENTOS RECENTES (Últimos 5) */}
      <div className="bg-white rounded-lg border-2 p-4 shadow-sm">
        <h2 className="text-xs font-bold text-gray-500 mb-3 uppercase flex items-center gap-1">
          <Check className="w-3 h-3 text-green-500"/> Últimas 5 Recomendações
        </h2>
        {(() => {
          const { dados } = useAppContext();
          const recentes = [...(dados?.recomendacoes || [])]
            .sort((a, b) => {
              const da = a.data_recomendacao || a.data || '';
              const db = b.data_recomendacao || b.data || '';
              if (db !== da) return db.localeCompare(da);
              return String(b.id || '').localeCompare(String(a.id || ''));
            })
            .filter((v, i, arr) => {
               return arr.findIndex(t => 
                  t.id === v.id || 
                  (t.maquina === v.maquina && t.produto === v.produto && (t.data_recomendacao || t.data) === (v.data_recomendacao || v.data))
               ) === i;
            })
            .slice(0, 5);

          if (recentes.length === 0) return <p className="text-xs text-gray-400 italic">Nenhum registro recente.</p>;
          return (
            <div className="space-y-2">
              {recentes.map((r: any) => (
                <div key={r.id} className="text-xs flex justify-between items-center py-2 border-b last:border-0 border-gray-100">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800">{r.cultura} - {r.safra}</span>
                    <span className="text-[10px] text-gray-400">{U.formatDate(r.data_recomendacao || r.data)}</span>
                  </div>
                  <div className="flex justify-end items-center gap-2">
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-bold">
                      {r.itens?.length || 0} itens
                    </span>
                    <ScrollText className="w-3 h-3 text-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* HISTÓRICO DE RECOMENDAÇÕES */}
      <RecHistoryList />
    </div>
  );
}
