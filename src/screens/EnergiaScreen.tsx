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
      leitura_ant_04: '', 
      leitura_atual_04: '',
      leitura_ant_08: '', 
      leitura_atual_08: '',
      centroCusto: ''
  });
  
  const [filterData, setFilterData] = useState(U.todayIso());
  const [filterText, setFilterText] = useState('');

  // 1. Busca Dados do Ponto Selecionado
  const pontoSelecionado = useMemo(() => {
    return ativos.pontosEnergia.find((l:any) => (l.nome === form.ponto) || (l === form.ponto));
  }, [form.ponto, ativos.pontosEnergia]);

  // Lógica de Mapeamento por Classe Tarifária
  const mapping = useMemo(() => {
    const classe = pontoSelecionado?.classe_tarifaria || 'rural_mono';
    
    if (classe === 'rural_mono') return { tipo: 'Padrao', constant: 1, label: 'Rural Monofásica' };
    if (classe === 'comercial_tri') return { tipo: 'Padrao', constant: 80, label: 'Comercial Trifásica' };
    if (classe === 'irrigante_tri') return { tipo: 'Horario', constant: 40, label: 'Irrigante Noturno' };
    
    // Personalizado
    return { 
        tipo: pontoSelecionado?.tipo_medicao || 'Padrao', 
        constant: U.parseDecimal(pontoSelecionado?.constante_medidor || '1'),
        label: 'Personalizado'
    };
  }, [pontoSelecionado]);

  const isHorario = mapping.tipo === 'Horario';
  const constante = mapping.constant;

  // Cálculos Automáticos
  const consumo_04 = useMemo(() => {
      const atual = U.parseDecimal(form.leitura_atual_04);
      const ant = U.parseDecimal(form.leitura_ant_04);
      return atual > ant ? (atual - ant) * constante : 0;
  }, [form.leitura_atual_04, form.leitura_ant_04, constante]);

  const consumo_08 = useMemo(() => {
      if (!isHorario) return 0;
      const atual = U.parseDecimal(form.leitura_atual_08);
      const ant = U.parseDecimal(form.leitura_ant_08);
      return atual > ant ? (atual - ant) * constante : 0;
  }, [form.leitura_atual_08, form.leitura_ant_08, isHorario, constante]);

  const consumo = (consumo_04 + consumo_08).toFixed(0);

  const valorEstimado = useMemo(() => {
    const params = ativos.parametros?.energia || {};
    const valConsumo = U.parseDecimal(consumo);
    const tarifaPadrao = U.parseDecimal(params.custoKwhPadrao || '0.923');

    // Se não houver leitura nos campos principais, ou campos vazios, mostra 0
    if (!form.leitura_atual_04 || (isHorario && !form.leitura_atual_08)) return "0.00";

    // Se consumo for ZERO após preencher, aplica Taxa Mínima (Custo de Disponibilidade)
    // Cálculo sugerido: 100 kWh * Tarifa Padrão
    if (valConsumo <= 0) return (100 * tarifaPadrao).toFixed(2);
      
    if (!isHorario) {
        return (consumo_04 * tarifaPadrao).toFixed(2);
    } else {
        const tarifaPonta = U.parseDecimal(params.custoKwhPonta || '2.50');
        const tarifaFora = U.parseDecimal(params.custoKwhForaPonta || '0.45');
        return (consumo_04 * tarifaPonta + consumo_08 * tarifaFora).toFixed(2);
    }
  }, [form.leitura_atual_04, form.leitura_atual_08, consumo, consumo_04, consumo_08, isHorario, ativos.parametros]);

  const handlePontoChange = (e: any) => {
      const nomePonto = e.target.value;
      
      // 1. Busca o Medidor nas Configurações
      const pontoObj = ativos.pontosEnergia.find((l:any) => (l.nome === nomePonto) || (l === nomePonto));
      const medidorAuto = (pontoObj && typeof pontoObj === 'object') ? pontoObj.identificador_externo : '';

      // 2. Busca a Última Leitura no Histórico
      const ultimoRegistro = buscarUltimaLeitura('energia', 'ponto', nomePonto);
      
      let leituraAnt04 = '0';
      let leituraAnt08 = '0';

      if (ultimoRegistro) {
          leituraAnt04 = ultimoRegistro.leitura_atual_04 || '0';
          leituraAnt08 = ultimoRegistro.leitura_atual_08 || '0';
      } else if (pontoObj && typeof pontoObj === 'object') {
          // Fallback para leitura inicial do cadastro
          leituraAnt04 = pontoObj.leitura_inicial_04 || '0';
          leituraAnt08 = pontoObj.leitura_inicial_08 || '0';
      }

      setForm(prev => {
          // Busca Centro de Custo vinculado a este medidor/ponto
          const ccVinculado = (ativos.centros_custos || []).find((cc: any) => 
            cc.tipo_vinculo === 'Medidor de Energia' && cc.vinculo_id === nomePonto
          );

          return { 
              ...prev, 
              ponto: nomePonto, 
              medidor: medidorAuto || prev.medidor, 
              leitura_ant_04: leituraAnt04,
              leitura_ant_08: leituraAnt08,
              centroCusto: ccVinculado ? ccVinculado.nome : prev.centroCusto
          };
      });
  };

  const enviar = (e: any) => {
    e.preventDefault();
    
    // 1. Validação de Consumo (Permitir zero com confirmação)
    const valConsumo = U.parseDecimal(consumo);
    if (valConsumo < 0) { 
        toast.error("A leitura atual não pode ser menor que a anterior."); 
        return; 
    }

    if (valConsumo === 0) {
        const confirmZero = window.confirm(
            "Não houve consumo no mês atual? \nA leitura não teve mudança perante a última, está correto?"
        );
        if (!confirmZero) return;
    }
    
    // 2. Validação de Data
    const dateCheck = validateOperationalDate(form.data_leitura);
    if (!dateCheck.valid) { toast.error(dateCheck.error || 'Data Inválida'); return; }
    if (dateCheck.warning && !window.confirm(dateCheck.warning)) return;

    // 3. Validação de Sequência (Ponta 04)
    const atual04 = U.parseDecimal(form.leitura_atual_04);
    const ant04 = U.parseDecimal(form.leitura_ant_04);
    if (atual04 < ant04) {
        toast.error(`Leitura Atual 04 (${atual04}) não pode ser menor que a anterior (${ant04}).`);
        return;
    }

    // 4. Validação de Sequência (Fora Ponta 08)
    if (isHorario) {
        const atual08 = U.parseDecimal(form.leitura_atual_08);
        const ant08 = U.parseDecimal(form.leitura_ant_08);
        if (atual08 < ant08) {
            toast.error(`Leitura Atual 08 (${atual08}) não pode ser menor que a anterior (${ant08}).`);
            return;
        }
    }

    // 5. Validação de Frequência (1 por Mês)
    const mesAtual = form.data_leitura.substring(0, 7); // YYYY-MM
    const jaExisteMes = (dados.energia || []).some((r: any) => 
        (r.ponto === form.ponto || r.medidor === form.medidor) && 
        (r.data_leitura || r.data).startsWith(mesAtual)
    );

    if (jaExisteMes) {
        toast.error(`Já existe uma leitura registrada para este medidor em ${mesAtual}.`);
        return;
    }
    
    const novo = { 
        ...form, 
        consumo_04,
        consumo_08,
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
            "Estimativa": `R$ ${valorEstimado}`,
            "Ponta (04)": `${consumo_04} kWh`,
            "Fora Ponta (08)": isHorario ? `${consumo_08} kWh` : 'N/A'
        },
        status: 'Pendente',
        data_abertura: new Date().toISOString()
    };

    genericSave('os', novaOS, {
        type: ACTIONS.ADD_RECORD,
        modulo: 'os',
        record: novaOS
    });
    
    setForm({ 
        data_leitura: U.todayIso(), 
        ponto: '', 
        medidor: '', 
        leitura_ant_04: '', 
        leitura_atual_04: '', 
        leitura_ant_08: '', 
        leitura_atual_08: '', 
        centroCusto: '' 
    });
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

          {form.ponto && (
            <div className="flex gap-2">
                <div className="flex-1 bg-yellow-50 border border-yellow-100 p-2 rounded flex flex-col items-center shadow-sm text-center">
                    <span className="text-[10px] uppercase font-bold text-yellow-600">Classe</span>
                    <span className="text-sm font-medium text-yellow-800 leading-tight">{mapping.label}</span>
                </div>
                <div className="flex-1 bg-yellow-50 border border-yellow-100 p-2 rounded flex flex-col items-center shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-yellow-600">Tipo</span>
                    <span className="text-sm font-bold text-yellow-800">{isHorario ? 'Horário' : 'Padrao'}</span>
                </div>
                <div className="flex-1 bg-yellow-50 border border-yellow-100 p-2 rounded flex flex-col items-center shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-yellow-600">Constante</span>
                    <span className="text-sm font-bold text-yellow-800">x {constante}</span>
                </div>
            </div>
          )}


              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <Input 
                        label={isHorario ? "Ant. Ponta (04)" : "Leitura Anterior"}
                        type="text" 
                        value={form.leitura_ant_04} 
                        readOnly
                        className="w-full px-1 py-1 bg-gray-50 font-bold text-yellow-600 outline-none text-center border-2 border-yellow-200 rounded-lg"
                        placeholder="-"
                      />
                  </div>
                  <div className="space-y-1">
                      <Input 
                        label={isHorario ? "Atual Ponta (04)" : "Leitura Atual"}
                        type="text" 
                        value={form.leitura_atual_04} 
                        onChange={(e: any) => setForm({...form, leitura_atual_04: e.target.value})}
                        numeric={true}
                        className="w-full px-1 py-1 border-2 border-gray-300 rounded-lg font-bold text-gray-900 focus:border-yellow-200 focus:outline-none text-center"
                        placeholder="Ex: 1250"
                        required
                      />
                  </div>
              </div>

              {isHorario && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                    <div className="space-y-1">
                        <Input 
                            label="Ant. Fora Ponta (08)"
                            type="text" 
                            value={form.leitura_ant_08} 
                            readOnly
                            className="w-full px-1 py-1 bg-gray-50 font-bold text-green-600 outline-none text-center border-2 border-green-200 rounded-lg"
                            placeholder="-"
                        />
                    </div>
                    <div className="space-y-1">
                        <Input 
                            label="Atual Fora Ponta (08)"
                            type="text" 
                            value={form.leitura_atual_08} 
                            onChange={(e: any) => setForm({...form, leitura_atual_08: e.target.value})}
                            numeric={true}
                            className="w-full px-1 py-1 border-2 border-gray-300 rounded-lg font-bold text-gray-900 focus:border-green-200 focus:outline-none text-center"
                            placeholder="Ex: 5000"
                            required
                        />
                    </div>
                </div>
              )}


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
                  <p className="text-xl font-bold text-green-400">R$ {U.formatValue(valorEstimado)}</p>
                  <p className="text-[10px] text-gray-500 mt-1">
                      Base: R$ {U.formatValue(ativos.parametros?.energia?.custoKwhPadrao || '0.923', 3)}/kWh
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

      {/* LANÇAMENTOS RECENTES (Últimos 5) */}
      <div className="bg-white rounded-lg border-2 p-4 shadow-sm">
        <h2 className="text-xs font-bold text-gray-500 mb-3 uppercase flex items-center gap-1">
          <Check className="w-3 h-3 text-yellow-500"/> Últimas 5 Leituras
        </h2>
        {(() => {
          const recentes = [...(dados?.energia || [])]
            .sort((a, b) => {
              // 1. Ordem Absoluta pela Leitura (Se houver)
              const va = U.parseDecimal(a.leitura_atual_04 || 0) + U.parseDecimal(a.leitura_atual_08 || 0);
              const vb = U.parseDecimal(b.leitura_atual_04 || 0) + U.parseDecimal(b.leitura_atual_08 || 0);
              if (va > 0 && vb > 0 && vb !== va) return vb - va;

              // 2. Fallback por data
              const da = a.data_leitura || a.data || '';
              const db = b.data_leitura || b.data || '';
              if (db !== da) return db.localeCompare(da);

              return String(b.id || '').localeCompare(String(a.id || ''));
            })
            .filter((v, i, arr) => {
               return arr.findIndex(t => 
                  t.id === v.id || 
                  (t.medidor === v.medidor && t.leitura_atual_04 === v.leitura_atual_04 && (t.data_leitura || t.data) === v.data_leitura)
               ) === i;
            })
            .slice(0, 5);

          if (recentes.length === 0) return <p className="text-xs text-gray-400 italic">Nenhum registro recente.</p>;
          return (
            <div className="space-y-2">
              {recentes.map((r: any) => (
                <div key={r.id} className="text-xs flex justify-between items-center py-2 border-b last:border-0 border-gray-100">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800 truncate max-w-[120px]">{r.ponto}</span>
                    <span className="text-[10px] text-gray-400">{U.formatDate(r.data_leitura || r.data)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-yellow-600">{r.consumo} kWh</span>
                    <span className="text-[10px] text-gray-400">Total (04 + 08)</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      <div className="bg-white rounded-lg border-2 overflow-hidden shadow-sm">
        <div className="p-3 border-b bg-gray-50">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Energia</h2>
            <div className="flex flex-col sm:flex-row gap-2">
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
