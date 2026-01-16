import React, { useState, useMemo } from 'react';
import { Utensils, FilePen, Trash2 } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader, Input, Select, TableWithShowMore } from '../components/ui/Shared';
import { U } from '../data/utils';
import { toast } from 'react-hot-toast';

export default function RefeicoesScreen() {
  const { dados, dispatch, setTela, ativos } = useAppContext();
  const [form, setForm] = useState({ tipo: '', qtd: '', centro: '', data: U.todayIso() });
  const [filterDate, setFilterDate] = useState('');
  const [filterText, setFilterText] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(U.currentMonthIso());

  const valores: any = { 'Básica': 15, 'Executiva': 25, 'Especial': 35 };
  const tipoLimpo = form.tipo.split(' - ')[0];
  const total = (tipoLimpo && form.qtd) ? (valores[tipoLimpo] * U.parseDecimal(form.qtd)).toFixed(2) : '0.00';
  
  const enviar = (e: any) => { 
      e.preventDefault(); 
      const novo = { tipo: tipoLimpo, qtd: form.qtd, centro: form.centro, total, id: U.id('RF-'), data: form.data }; 
      const detalhes = { "Data": U.formatDate(form.data), "Tipo": tipoLimpo, "Qtd": form.qtd, "Centro de Custo": form.centro, "Valor Total": `R$ ${U.formatValue(total)}` };
      dispatch({ type: ACTIONS.ADD_RECORD, modulo: 'refeicoes', record: novo, osDescricao: `${form.qtd}x ${tipoLimpo} - R$ ${U.formatValue(total)}`, osDetalhes: detalhes }); 
      setForm({ tipo: '', qtd: '', centro: '', data: U.todayIso() }); 
      toast.success('Refeição solicitada!'); 
  };
  const excluir = (id: string) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir este registro de refeição?', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'refeicoes', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  
  const totalMes = useMemo(() => (dados.refeicoes || []).filter((i:any) => i.data && i.data.startsWith(selectedMonth)).reduce((s:number, i:any) => s + U.parseDecimal(i.total || 0), 0), [dados.refeicoes, selectedMonth]);
  const qtdMes = useMemo(() => (dados.refeicoes || []).filter((i:any) => i.data && i.data.startsWith(selectedMonth)).length, [dados.refeicoes, selectedMonth]);
  const listFilter = useMemo(() => (dados.refeicoes || []).filter((i:any) => (!filterDate || i.data === filterDate) && (!filterText || i.tipo.toLowerCase().includes(filterText.toLowerCase()) || i.centro.toLowerCase().includes(filterText.toLowerCase()))).reverse(), [dados.refeicoes, filterDate, filterText]);

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Refeições" icon={Utensils} colorClass="bg-orange-500" />
      <div className="bg-white border-2 rounded-xl p-3 shadow-sm">
          <div className="flex justify-between items-center mb-2"><p className="text-xs font-bold uppercase text-gray-500">Resumo Mensal</p><input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="text-xs border rounded p-1" /></div>
          <div className="grid grid-cols-2 gap-4"><div><p className="text-2xl font-black text-green-600">R$ {U.formatValue(totalMes)}</p><p className="text-xs text-gray-500">Total Gasto</p></div><div className="border-l pl-4"><p className="text-2xl font-black text-blue-600">{qtdMes}</p><p className="text-xs text-gray-500">Refeições Solicitadas</p></div></div>
      </div>
      <div className="bg-white rounded-lg border-2 p-4">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700">Registro de Consumo</h2>
        <form onSubmit={enviar} className="space-y-3">
          <Input label="Data" type="date" value={form.data} onChange={(e:any) => setForm({ ...form, data: e.target.value })} required />
          <Select label="Refeição" value={form.tipo} onChange={(e:any) => setForm({ ...form, tipo: e.target.value })} required>
            <option value="">Selecione...</option>{ativos.tiposRefeicao.map((t:string) => <option key={t}>{t}</option>)}
          </Select>
          <Input label="Quantidade" type="number" min="1" placeholder="Qtd" value={form.qtd} onChange={(e:any) => setForm({ ...form, qtd: e.target.value })} required />
          <Select label="Centro de Custo" value={form.centro} onChange={(e:any) => setForm({ ...form, centro: e.target.value })} required>
                 <option value="">Selecione...</option>{ativos.centrosCusto.map((c:string) => <option key={c}>{c}</option>)}
          </Select>
          {tipoLimpo && form.qtd && (<div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3 text-center"><p className="text-xs text-orange-700">Valor Total</p><p className="text-2xl font-bold text-orange-900">R$ {U.formatValue(total)}</p></div>)}
          <button type="submit" className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium">Registrar</button>
        </form>
      </div>
      <div className="bg-white rounded-lg border-2 overflow-x-auto">
        <div className="p-3 border-b bg-gray-50 rounded-t-lg">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Refeições</h2>
            <div className="flex gap-2"><input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="text-xs border rounded p-1" /><input type="text" placeholder="Buscar Refeição/Centro..." value={filterText} onChange={e => setFilterText(e.target.value)} className="text-xs border rounded p-1 flex-1" /></div>
        </div>
        <TableWithShowMore data={listFilter}>
            {(items:any[], Row:any) => (<><thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Data</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Tipo</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Qtd</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Total</th><th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th></tr></thead><tbody className="divide-y">{items.map(item => (<Row key={item.id} onDelete={() => excluir(item.id)}><td className="px-3 py-2 text-gray-700">{U.formatDate(item.data)}</td><td className="px-3 py-2 text-gray-700">{item.tipo}</td><td className="px-3 py-2 text-gray-700">{item.qtd}</td><td className="px-3 py-2 font-bold text-orange-600">R$ {U.formatValue(item.total)}</td></Row>))}</tbody></>)}
        </TableWithShowMore>
      </div>
    </div>
  );
}