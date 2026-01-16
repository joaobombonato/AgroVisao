import React, { useState, useMemo } from 'react';
import { Droplet } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader, Input, Select, TableWithShowMore } from '../components/ui/Shared';
import { U } from '../data/utils';
import { toast } from 'react-hot-toast';

export default function ChuvasScreen() {
  const { dados, dispatch, setTela, ativos } = useAppContext();
  const [form, setForm] = useState({ data: U.todayIso(), talhao: '', precipitacao: '' });
  const [filterText, setFilterText] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  const enviar = (e: any) => {
    e.preventDefault();
    const novo = { ...form, id: U.id('CH-'), usuario: 'João Felipe' };
    const detalhes = { "Data": U.formatDate(form.data), "Talhão": form.talhao, "Precipitação": `${form.precipitacao} mm` };
    dispatch({ type: ACTIONS.ADD_RECORD, modulo: 'chuvas', record: novo, osDescricao: `${form.precipitacao}mm em ${form.talhao}`, osDetalhes: detalhes });
    setForm({ data: U.todayIso(), talhao: '', precipitacao: '' });
    toast.success('Registro de chuvas criado!');
  };
  const excluir = (id: string) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir este registro de chuvas?', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'chuvas', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  const chuvasFiltradas = useMemo(() => (dados.chuvas || []).filter((i:any) => (!filterDate || i.data === filterDate) && (!filterText || i.talhao.toLowerCase().includes(filterText.toLowerCase()))).reverse(), [dados.chuvas, filterText, filterDate]);
  
  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Pluviométrico" icon={Droplet} colorClass="bg-cyan-500" />
      <div className="bg-white rounded-lg border-2 p-4">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700">Registro de Precipitações</h2>
        <form onSubmit={enviar} className="space-y-3">
          <Input label="Data" type="date" value={form.data} onChange={(e:any) => setForm({ ...form, data: e.target.value })} required />
          <Select label="Talhão" value={form.talhao} onChange={(e:any) => setForm({ ...form, talhao: e.target.value })} required>
             <option value="">Selecione...</option>{ativos.talhoesChuva.map((t:any) => <option key={t.nome} value={t.nome}>{t.nome}</option>)}
          </Select>
          <Input label="Precipitação (mm)" type="number" step="0.1" placeholder="Informar mm" value={form.precipitacao} onChange={(e:any) => setForm({ ...form, precipitacao: e.target.value })} required />
          <button type="submit" className="w-full bg-cyan-500 text-white py-3 rounded-lg font-medium">Registrar</button>
        </form>
      </div>
      <div className="bg-white rounded-lg border-2">
        <div className="p-3 border-b bg-gray-50 rounded-t-lg">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Chuvas</h2>
            <div className="flex gap-2"><input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="text-xs border rounded p-1" /><input type="text" placeholder="Buscar Talhão..." value={filterText} onChange={e => setFilterText(e.target.value)} className="w-full text-xs border rounded p-1" /></div>
        </div>
        <TableWithShowMore data={chuvasFiltradas}>
            {(items:any[], Row:any) => (<><thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Data</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Talhão</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Precip.</th><th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th></tr></thead><tbody className="divide-y">{items.map(item => (<Row key={item.id} onDelete={() => excluir(item.id)}><td className="px-3 py-2 text-gray-700">{U.formatDate(item.data)}</td><td className="px-3 py-2 text-gray-700">{item.talhao}</td><td className="px-3 py-2 font-bold text-cyan-600">{item.precipitacao}mm</td></Row>))}</tbody></>)}
        </TableWithShowMore>
      </div>
    </div>
  );
}