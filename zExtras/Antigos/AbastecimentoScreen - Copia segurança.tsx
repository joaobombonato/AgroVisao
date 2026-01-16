import React, { useState, useMemo, useEffect } from 'react';
import { Fuel, FilePen, Trash2, X as XClose, Minus, Plus } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader, Input, Select, TableWithShowMore } from '../components/ui/Shared';
import { U } from '../data/utils';
import { toast } from 'react-hot-toast';

// Sub-componente interno para o Formulário de Compra
function CompraCombustivelForm({ onClose }: any) {
  const { dados, dispatch } = useAppContext();
  const [form, setForm] = useState({ data: U.todayIso(), notaFiscal: '', litros: '', valorUnitario: '', nfFrete: '', valorFrete: '' });
  const [showFrete, setShowFrete] = useState(false);
  const valorTotal = useMemo(() => (U.parseDecimal(form.litros) * U.parseDecimal(form.valorUnitario)).toFixed(2), [form.litros, form.valorUnitario]);
  
  const enviar = (e: any) => {
    e.preventDefault();
    const novo = { ...form, litros: form.litros, valorUnitario: form.valorUnitario, valorTotal, id: U.id('CP-') };
    dispatch({ type: ACTIONS.ADD_RECORD, modulo: 'compras', record: novo, osDescricao: `Compra de ${form.litros}L (NF: ${form.notaFiscal})` });
    toast.success('Compra registrada!');
    setForm({ data: U.todayIso(), notaFiscal: '', litros: '', valorUnitario: '', nfFrete: '', valorFrete: '' });
  };
  const ultimasCompras = (dados.compras || []).slice(-5).reverse();
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b p-4"><h2 className="text-lg font-bold flex items-center gap-2"><Fuel className="w-5 h-5 text-green-500" /> Nova Compra de Diesel</h2><button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100"><XClose className="w-5 h-5" /></button></div>
        <form onSubmit={enviar} className="p-4 space-y-3">
          <Input label="Data" type="date" value={form.data} onChange={(e:any) => setForm({ ...form, data: e.target.value })} required />
          <Input label="Nota Fiscal" placeholder="Número da NF" value={form.notaFiscal} onChange={(e:any) => setForm({ ...form, notaFiscal: e.target.value })} required />
          <Input label="Litros (L)" type="number" step="0.01" placeholder="Informe Litros (L) da Compra" value={form.litros} onChange={(e:any) => setForm({ ...form, litros: e.target.value })} required />
          <Input label="Valor Unitário (R$)" type="number" step="0.01" placeholder="Informe valor do litro (R$)" value={form.valorUnitario} onChange={(e:any) => setForm({ ...form, valorUnitario: e.target.value })} required />
          <div className="pt-2 border-t">
              <button type="button" onClick={() => setShowFrete(!showFrete)} className="text-xs text-gray-500 font-bold mb-2 flex items-center gap-1">Frete (Opcional) {showFrete ? <Minus className="w-3 h-3"/> : <Plus className="w-3 h-3"/>}</button>
              {showFrete && (<><Input label="NF Frete" placeholder="Número NF Frete" value={form.nfFrete} onChange={(e:any) => setForm({ ...form, nfFrete: e.target.value })} /><Input label="Valor Frete (R$)" type="number" step="0.01" placeholder="Informe Valor frete (R$)" value={form.valorFrete} onChange={(e:any) => setForm({ ...form, valorFrete: e.target.value })} /></>)}
          </div>
          <div className="px-3 py-2 bg-green-50 border-2 border-green-300 rounded-lg font-bold text-green-700 text-center">Total Combustível: R$ {U.formatValue(valorTotal)}</div>
          <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700">Registrar Compra</button>
        </form>
        <div className="p-4 border-t bg-gray-50">
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Últimas 5 Compras</p>
            {ultimasCompras.map((c:any) => (<div key={c.id} className="text-xs flex justify-between py-1 border-b last:border-0"><span>{U.formatDate(c.data)}</span><span>{c.litros}L</span><span className="font-bold">R$ {U.formatValue(c.valorTotal)}</span></div>))}
        </div>
      </div>
    </div>
  );
}

// Tela Principal de Abastecimento
export default function AbastecimentoScreen() {
  const { dados, dispatch, buscarUltimaLeitura, setTela, ativos } = useAppContext();
  const [form, setForm] = useState({ maquina: '', horimetro: '', bombaInicial: '', bombaFinal: '', data: U.todayIso() });
  const [showCompraForm, setShowCompraForm] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterMaq, setFilterMaq] = useState('');

  const qtd = useMemo(() => (U.parseDecimal(form.bombaFinal) - U.parseDecimal(form.bombaInicial)).toFixed(2), [form.bombaFinal, form.bombaInicial]);
  const estoqueInicial = 3000;
  const totalComprado = useMemo(() => (dados.compras || []).reduce((s:number, i:any) => s + U.parseDecimal(i.litros), 0), [dados.compras]);
  const totalUsado = useMemo(() => (dados.abastecimento || []).reduce((s:number, i:any) => s + U.parseDecimal(i.qtd), 0), [dados.abastecimento]);
  const estoqueAtual = (estoqueInicial + totalComprado - totalUsado);
  const perc = Math.min(((estoqueAtual / 15000) * 100), 100).toFixed(0); 

  useEffect(() => {
     const ultimaBomba = buscarUltimaLeitura('abastecimento', 'bombaFinal', '*');
     setForm(prev => ({ ...prev, bombaInicial: ultimaBomba ? ultimaBomba.bombaFinal : '0.00' }));
  }, [dados.abastecimento, buscarUltimaLeitura]);

  const horimetroAnterior = useMemo(() => {
      if(!form.maquina) return '0';
      const ultima = buscarUltimaLeitura('abastecimento', 'maquina', form.maquina);
      return ultima ? ultima.horimetro : '0';
  }, [form.maquina, buscarUltimaLeitura]);

  const enviar = (e: any) => {
    e.preventDefault();
    const litrosQtd = U.parseDecimal(qtd);
    if (litrosQtd <= 0) { toast.error("Quantidade deve ser positiva."); return; }
    const novo = { ...form, qtd, id: U.id('AB-') };
    const detalhes = { "Data": U.formatDate(form.data), "Máquina": form.maquina, "Horímetro": form.horimetro, "Bomba Inicial": `${form.bombaInicial} L`, "Bomba Final": `${form.bombaFinal} L`, "Abastecido": `${qtd} L` };
    dispatch({ type: ACTIONS.ADD_RECORD, modulo: 'abastecimento', record: novo, osDescricao: `${form.maquina} - ${qtd}L`, osDetalhes: detalhes });
    setForm({ maquina: '', horimetro: '', bombaInicial: '', bombaFinal: '', data: U.todayIso() });
    toast.success('Abastecimento registrado!');
  };

  const excluir = (id: string) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir abastecimento? Afeta o estoque.', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'abastecimento', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  const listFilter = useMemo(() => (dados.abastecimento || []).filter((i:any) => (!filterDate || i.data === filterDate) && (!filterMaq || i.maquina.toLowerCase().includes(filterMaq.toLowerCase()))).reverse(), [dados.abastecimento, filterDate, filterMaq]);

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Abastecimento" icon={Fuel} colorClass="bg-red-500" />
      <div className="bg-red-500 rounded-lg p-4 text-center text-white shadow-md">
          <p className="text-sm opacity-90 uppercase font-bold">Estoque Atual</p>
          <p className="text-4xl font-black tracking-tight">{U.formatInt(estoqueAtual)} L</p>
          <div className="w-full bg-red-800 rounded-full h-2 mt-2 overflow-hidden"><div className="bg-white h-2 transition-all duration-500" style={{ width: `${perc}%` }}></div></div>
          <p className="text-xs opacity-75 mt-1 text-right">{perc}% (Tanque 15k)</p>
      </div>
      <div className="bg-white rounded-lg border-2 p-4">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700">Registro de Consumo</h2>
        <form onSubmit={enviar} className="space-y-3">
          <Input label="Data" type="date" value={form.data} onChange={(e:any) => setForm({ ...form, data: e.target.value })} required />
          <div className="space-y-1">
             <p className="text-xs font-medium text-gray-600">Bomba Inicial</p>
             <div className="bg-red-50 border-2 border-red-200 rounded-lg p-2">
                <p className="text-[10px] text-red-800 font-bold mb-1 uppercase">Automático (Último Registro)</p>
                <input type="text" value={form.bombaInicial} readOnly className="w-full bg-transparent font-bold text-gray-800 outline-none" />
             </div>
          </div>
          <Input label="Bomba Final (L)" type="number" step="0.01" placeholder="Informar Bomba Final (L)" value={form.bombaFinal} onChange={(e:any) => setForm({ ...form, bombaFinal: e.target.value })} required />
          <Select label="Máquina / Veículo" value={form.maquina} onChange={(e:any) => setForm({ ...form, maquina: e.target.value })} required>
                <option value="">Selecione...</option>{ativos.maquinas.map((m:string) => <option key={m}>{m}</option>)}
          </Select>
          <div className="space-y-1">
             <p className="text-xs font-medium text-gray-600">Horímetro / Km Anterior</p>
             <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-2">
                 <p className="text-[10px] text-gray-500 mb-1">Leitura anterior preenchimento automaticamente</p>
                 <input type="text" value={horimetroAnterior} readOnly className="w-full bg-transparent text-gray-600 font-bold outline-none" />
             </div>
          </div>
          <Input label="Horímetro / Km Atual" type="number" placeholder="Informar leitura" value={form.horimetro} onChange={(e:any) => setForm({ ...form, horimetro: e.target.value })} required />
          <div className="px-3 py-2 bg-red-50 border-2 border-red-300 rounded-lg font-bold text-red-700 text-center">Quantidade: {U.formatValue(qtd)} L</div>
          <button type="submit" className="w-full bg-red-500 text-white py-3 rounded-lg font-medium">Registrar Consumo</button>
        </form>
      </div>
      <div className="bg-white rounded-lg border-2 p-4">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700">Estoque</h2>
        <button onClick={() => setShowCompraForm(true)} className="w-full bg-green-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-700"><Fuel className="w-5 h-5" /> Nova Compra de Diesel</button>
      </div>
      {showCompraForm && <CompraCombustivelForm onClose={() => setShowCompraForm(false)} />}
      <div className="bg-white rounded-lg border-2">
        <div className="p-3 border-b bg-gray-50 rounded-t-lg">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Abastecimento</h2>
            <div className="flex gap-2"><input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="text-xs border rounded p-1" /><input type="text" placeholder="Filtrar Máquina" value={filterMaq} onChange={e => setFilterMaq(e.target.value)} className="text-xs border rounded p-1 flex-1" /></div>
        </div>
        <TableWithShowMore data={listFilter}>
            {(items:any[], Row:any) => (<><thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Data</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Qtd</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Máq.</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Horím.</th><th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th></tr></thead><tbody className="divide-y">{items.map(item => (<Row key={item.id} onDelete={() => excluir(item.id)}><td className="px-3 py-2 text-gray-700">{U.formatDate(item.data)}</td><td className="px-3 py-2 font-bold text-red-600">{U.formatValue(item.qtd)}L</td><td className="px-3 py-2 text-gray-700 text-xs">{item.maquina}</td><td className="px-3 py-2 text-gray-700 text-xs">{item.horimetro}</td></Row>))}</tbody></>)}
        </TableWithShowMore>
      </div>
    </div>
  );
}