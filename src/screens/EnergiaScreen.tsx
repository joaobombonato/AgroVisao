import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Zap, Search, ChevronDown, Check, X, History, Calculator } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader, Input, TableWithShowMore, SearchableSelect } from '../components/ui/Shared';

import { U, validateOperationalDate, getOperationalDateLimits } from '../utils';
import { toast } from 'react-hot-toast';

// ==========================================
// Componente: SELECT PESQUISÁVEL (Reutilizado)
// ==========================================
// ==========================================
// SEARCHABLE SELECT: IMPORTADO DO SHARED
// ==========================================

// ==========================================
// TELA PRINCIPAL: ENERGIA
// ==========================================
export default function EnergiaScreen() {
  const { dados, dispatch, setTela, ativos, buscarUltimaLeitura, genericSave } = useAppContext();
  
  const [form, setForm] = useState({ 
      data_leitura: U.todayIso(), 
      ponto: '', 
      medidor: '', 
      leituraAnterior: '', 
      leituraAtual: '',
      centroCusto: ''
  });
  
  const [filterData, setFilterData] = useState('');
  const [filterText, setFilterText] = useState('');

  // Cálculos Automáticos
  const consumo = useMemo(() => {
      const atual = U.parseDecimal(form.leituraAtual);
      const ant = U.parseDecimal(form.leituraAnterior);
      return atual > ant ? (atual - ant).toFixed(0) : '0';
  }, [form.leituraAtual, form.leituraAnterior]);

  const valorEstimado = useMemo(() => {
      const kwh = U.parseDecimal(consumo);
      const custoKwhStr = ativos.parametros?.energia?.custoKwh;
      const custoMedio = custoKwhStr !== '' ? U.parseDecimal(custoKwhStr) : 0.92; 
      return (kwh * custoMedio).toFixed(2);
  }, [consumo, ativos.parametros]);

  const handlePontoChange = (e: any) => {
      const nomePonto = e.target.value;
      
      // 1. Busca o Medidor nas Configurações
      const pontoObj = ativos.pontosEnergia.find((l:any) => (l.nome === nomePonto) || (l === nomePonto));
      const medidorAuto = (pontoObj && typeof pontoObj === 'object') ? pontoObj.medidor : '';

      // 2. Busca a Última Leitura no Histórico
      const ultimoRegistro = buscarUltimaLeitura('energia', 'ponto', nomePonto);
      const leituraAntAuto = ultimoRegistro ? ultimoRegistro.leituraAtual : '0';

      setForm(prev => {
          const novoPonto = nomePonto;
          
          // Busca Centro de Custo vinculado a este medidor/ponto
          const ccVinculado = (ativos.centros_custos || []).find((cc: any) => 
            cc.tipo_vinculo === 'Medidor de Energia' && cc.vinculo_id === nomePonto
          );

          return { 
              ...prev, 
              ponto: nomePonto, 
              medidor: medidorAuto || prev.medidor, 
              leituraAnterior: leituraAntAuto,
              centroCusto: ccVinculado ? ccVinculado.nome : prev.centroCusto
          };
      });
  };

  const enviar = (e: any) => {
    e.preventDefault();
    if (U.parseDecimal(consumo) <= 0) { toast.error("Leitura Atual deve ser maior que a Anterior"); return; }
    
    // 1. Validação de Data
    const dateCheck = validateOperationalDate(form.data_leitura);
    if (!dateCheck.valid) { toast.error(dateCheck.error || 'Data Inválida'); return; }
    if (dateCheck.warning && !window.confirm(dateCheck.warning)) return;


    // 2. Validação Sequencial (Leitura > Anterior)
    const atual = U.parseDecimal(form.leituraAtual);
    const anterior = U.parseDecimal(form.leituraAnterior);
    if (atual <= anterior && anterior > 0) {
        toast.error(`A leitura atual (${atual}) deve ser MAIOR que a anterior (${anterior}).`);
        return;
    }

    // 3. Validação de Frequência (1 por Mês)
    const mesAtual = form.data_leitura.substring(0, 7); // YYYY-MM
    const jaExisteMes = (dados.energia || []).some((r: any) => 
        (r.ponto === form.ponto || r.medidor === form.medidor) && 
        (r.data_leitura || r.data).startsWith(mesAtual)
    );

    // Verificar se existe OS cancelada para permitir re-leitura? 
    // Por enquanto, bloqueia se tiver registro ativo.
    if (jaExisteMes) {
        toast.error(`Já existe uma leitura registrada para este medidor em ${mesAtual}.`);
        return;
    }
    
    const novo = { 
        ...form, 
        consumo, 
        valorEstimado, 
        safra_id: ativos.parametros?.safraAtiva || null,
        id: U.id('EN-') 
    };

    
    const descOS = `Energia: ${form.ponto} (${consumo} kWh)`;
    genericSave('energia', novo, { type: ACTIONS.ADD_RECORD, modulo: 'energia' });

    // 2. Persistência OS
    const novaOS = {
        id: U.id('OS-EN-'),
        modulo: 'Energia',
        descricao: descOS,
        detalhes: { 
            "Ponto": form.ponto, 
            "Consumo": `${consumo} kWh`,
            "Estimativa": `R$ ${valorEstimado}`
        },
        status: 'Pendente',
        data_abertura: new Date().toISOString()
    };

    genericSave('os', novaOS, {
        type: ACTIONS.ADD_RECORD,
        modulo: 'os',
        record: novaOS
    });
    
    setForm({ data_leitura: U.todayIso(), ponto: '', medidor: '', leituraAnterior: '', leituraAtual: '', centroCusto: '' });
    toast.success('Leitura de energia registrada!');
  };

  const excluir = (id: string) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir leitura?', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'energia', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  
  const listFilter = useMemo(() => (dados.energia || []).filter((i:any) => {
      const txt = filterText.toLowerCase();
      return (!filterData || (i.data_leitura || i.data) === filterData) && 
             (!filterText || i.ponto.toLowerCase().includes(txt) || i.medidor.toLowerCase().includes(txt) || i.id.toLowerCase().includes(txt));
  }).reverse(), [dados.energia, filterData, filterText]);

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Energia Elétrica" icon={Zap} colorClass="bg-yellow-500" />
      
      <div className="bg-white rounded-lg border-2 p-4 shadow-sm">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-yellow-500"/> Nova Leitura
        </h2>
        
        <form onSubmit={enviar} className="space-y-3">
		
          {/* Campo Data Manual (Para manter o padrão visual) */}
            <Input 
                label="Data da Leitura" 
                type="date" 
                value={form.data_leitura} 
                onChange={(e: any) => setForm({ ...form, data_leitura: e.target.value })} 
                required 
                max={getOperationalDateLimits().max}
                min={getOperationalDateLimits().min}
            />
          
          <SearchableSelect 
              label="Ponto de Energia" 
              placeholder="Buscar ponto... Ex: Sede" 
              options={ativos.pontosEnergia} 
              value={form.ponto} 
              onChange={handlePontoChange} 
              required 
              color="yellow"
          />
          
          {/* MEDIDOR AUTOMÁTICO (AMARELO RESTAURADO) */}
          <div className="space-y-1">
             <div className="flex gap-1">
                <p className="text-xs font-bold text-gray-500">Numeração CEMIG</p>
                <span className="text-[10px] text-yellow-600 bg-yellow-100 px-1 rounded">Auto</span>
             </div>
             <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-2">
                <input 
                    type="text" 
                    value={form.medidor} 
                    readOnly
                    className="w-full bg-transparent font-bold text-yellow-800 outline-none text-sm"
                    placeholder="Nº do Medidor"
                />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <Input 
                        label="Leitura Anterior"
                        type="text" 
                        value={form.leituraAnterior} 
                        readOnly
                        className="w-full px-1 py-1 bg-gray-50 font-bold text-yellow-600 outline-none text-center border-2 border-yellow-200 rounded-lg"
                        placeholder="-"
                      />
                  </div>
                  <div className="space-y-1">
                      <Input 
                        label="Leitura Atual"
                        type="text" 
                        value={form.leituraAtual} 
                        onChange={(e: any) => setForm({...form, leituraAtual: e.target.value})}
                        numeric={true}
                        className="w-full px-1 py-1 border-2 border-gray-300 rounded-lg font-bold text-gray-900 focus:border-yellow-200 focus:outline-none text-center"
                        placeholder="Ex: 1250,5"
                        required
                      />
                  </div>
              </div>


          {/* Card de Resultado */}
          <div className="flex items-center justify-between bg-gray-800 text-white p-4 rounded-xl shadow-lg mt-2 relative overflow-hidden">
              <div className="relative z-10">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">Consumo Calculado</p>
                  <p className="text-3xl font-bold text-yellow-400 leading-none">
                     {consumo} <span className="text-sm text-gray-400 font-normal">kWh</span>
                  </p>
                  
                  {/* Comparativo de Tendência */}
                  {(() => {
                      // Busca a meta específica do ponto selecionado
                      const pontoObj = ativos.pontosEnergia.find((p: any) => p.nome === form.ponto || p === form.ponto);
                      const metaLocal = pontoObj && typeof pontoObj === 'object' ? U.parseDecimal(pontoObj.meta_consumo) : 0;
                      
                      const valConsumo = U.parseDecimal(consumo);
                      
                      if (metaLocal > 0 && valConsumo > 0) {
                          const isHigh = valConsumo > metaLocal;
                          const diff = Math.abs(valConsumo - metaLocal);
                          return (
                              <div className={`flex items-center gap-1 text-[10px] mt-2 px-2 py-0.5 rounded-full w-fit ${isHigh ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                                  {isHigh ? '▲' : '▼'} {diff} kWh da Meta ({metaLocal})
                              </div>
                          );
                      }
                      return <div className="text-[10px] text-gray-500 mt-2">Sem meta definida para este medidor</div>;
                  })()}
              </div>

              <div className="text-right relative z-10">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">Custo Estimado</p>
                  <p className="text-xl font-bold text-green-400">R$ {valorEstimado}</p>
                  <p className="text-[10px] text-gray-500 mt-1">
                      Base: R$ {ativos.parametros?.energia?.custoKwh || 0.92}/kWh
                  </p>
              </div>
              
              {/* Sparkline Decorativo de Fundo */}
              <div className="absolute right-0 bottom-0 opacity-10">
                 <Zap className="w-24 h-24 text-yellow-500 transform rotate-12 translate-x-4 translate-y-4"/>
              </div>
          </div>

          <button type="submit" className="w-full bg-yellow-500 text-white py-3 rounded-lg font-bold hover:bg-yellow-600 transition-colors shadow-md flex items-center justify-center gap-2">
              <Check className="w-5 h-5" /> Registrar Leitura
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg border-2 overflow-hidden shadow-sm">
        <div className="p-3 border-b bg-gray-50">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Energia</h2>
            <div className="flex flex-wrap gap-2">
                <Input 
                    type="date" 
                    value={filterData} 
                    onChange={(e: any) => setFilterData(e.target.value)} 
                    className="text-xs border rounded p-2 min-w-[140px]" 
                />
                <div className="relative flex-1 min-w-[120px]">
                    <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400"/>
                    <input type="text" placeholder="Local ou ID..." value={filterText} onChange={e => setFilterText(e.target.value)} className="w-full pl-8 text-xs border rounded p-2" />
                </div>
            </div>
        </div>
        <TableWithShowMore data={listFilter}>
            {(items:any[], Row:any) => (
                <>
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Data</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Local</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">ID</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Consumo</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {items.map(item => (
                            <Row key={item.id} onDelete={() => excluir(item.id)}>
                                <td className="px-3 py-2 text-gray-700 text-xs whitespace-nowrap">{U.formatDate(item.data_leitura || item.data)}</td>
                                <td className="px-3 py-2 text-gray-700 text-xs">
                                    <div className="font-bold">{item.local}</div>
                                    <div className="text-[10px] text-gray-500">MED: {item.medidor}</div>
                                </td>
                                <td className="px-3 py-2 text-gray-500 text-[10px]">{item.id}</td>
                                <td className="px-3 py-2 text-right">
                                    <div className="font-bold text-yellow-600 text-sm">{item.consumo} kWh</div>
                                </td>
                            </Row>
                        ))}
                    </tbody>
                </>
            )}
        </TableWithShowMore>
      </div>
    </div>
  );
}
