import React, { useState, useMemo } from 'react';
import { Zap } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader, Input, Select, TableWithShowMore } from '../components/ui/Shared';
import { U } from '../data/utils';
import { toast } from 'react-hot-toast';

export default function EnergiaScreen() {
  const { dados, dispatch, buscarUltimaLeitura, setTela, ativos } = useAppContext();
  const [form, setForm] = useState({ medidor: '', local: '', anterior: '', atual: '', data: U.todayIso() });
  const [filterDate, setFilterDate] = useState('');
  const [filterText, setFilterText] = useState('');

  const consumo = useMemo(() => {
    const a = U.parseDecimal(form.atual);
    const b = U.parseDecimal(form.anterior);
    return (a - b).toFixed(2);
  }, [form.atual, form.anterior]);

  const handleLocalChange = (e: any) => {
      const localNome = e.target.value;
      const localObj = ativos.locaisEnergia.find((l:any) => l.nome === localNome);
      const medidor = localObj ? localObj.medidor : '';
      setForm(prev => ({ ...prev, local: localNome, medidor: medidor, anterior: '' }));
      if (medidor) {
          const ultimo = buscarUltimaLeitura('energia', 'medidor', medidor);
          if (ultimo && ultimo.atual) setForm(prev => ({ ...prev, anterior: ultimo.atual }));
      }
  };

  const enviar = (e: any) => {
    e.preventDefault();
    const novo = { ...form, consumo, id: U.id('EN-') };
    const detalhes = { "Data": U.formatDate(form.data), "Local": form.local, "Medidor": form.medidor, "Anterior": form.anterior, "Atual": form.atual, "Consumo": `${consumo} kWh` };
    dispatch({ type: ACTIONS.ADD_RECORD, modulo: 'energia', record: novo, osDescricao: `Medidor ${form.medidor} - ${consumo} kWh`, osDetalhes: detalhes });
    setForm({ medidor: '', local: '', anterior: '', atual: '', data: U.todayIso() });
    toast.success('Leitura de energia registrada!');
  };

  const excluir = (id: string) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir este registro de energia?', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'energia', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  const listFilter = useMemo(() => (dados.energia || []).filter((i:any) => (!filterDate || i.data === filterDate) && (!filterText || i.local.toLowerCase().includes(filterText.toLowerCase()) || i.medidor.toLowerCase().includes(filterText.toLowerCase()))).reverse(), [dados.energia, filterDate, filterText]);

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Energia" icon={Zap} colorClass="bg-yellow-500" />
      <div className="bg-white rounded-lg border-2 p-4">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700">Registro de Consumo</h2>
        <form onSubmit={enviar} className="space-y-3">
          <Input label="Data" type="date" value={form.data} onChange={(e:any) => setForm({ ...form, data: e.target.value })} required />
          <Select label="Localização" value={form.local} onChange={handleLocalChange} required>
             <option value="">Selecione...</option>{ativos.locaisEnergia.map((l:any) => <option key={l.nome} value={l.nome}>{l.nome}</option>)}
          </Select>
          <div className="space-y-1">
             <p className="text-xs font-medium text-gray-600">ID Medidor</p>
             <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-2">
                 <p className="text-[10px] text-yellow-800 font-bold mb-1 uppercase">Preenchido automaticamente do Local (Bloqueado)</p>
                 <input type="text" value={form.medidor} readOnly className="w-full bg-transparent font-bold text-gray-800 outline-none" placeholder="ID Medidor" />
             </div>
          </div>
          <div className="space-y-1">
             <p className="text-xs font-medium text-gray-600">Leitura Anterior</p>
             <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-2">
                 <p className="text-[10px] text-gray-500 mb-1">Leitura anterior preenchimento automaticamente</p>
                 <input type="text" value={form.anterior} readOnly className="w-full bg-transparent text-gray-600 font-bold outline-none" />
             </div>
          </div>
          <Input label="Leitura Atual (kWh)" type="number" placeholder="Informar leitura" value={form.atual} onChange={(e:any) => setForm({ ...form, atual: e.target.value })} required />
          <div className="px-3 py-2 bg-yellow-50 border-2 border-yellow-300 rounded-lg font-bold text-yellow-700 text-center">Consumo: {consumo} kWh</div>
          <button type="submit" className="w-full bg-yellow-500 text-white py-3 rounded-lg font-medium">Registrar</button>
        </form>
      </div>
      <div className="bg-white rounded-lg border-2">
        <div className="p-3 border-b bg-gray-50 rounded-t-lg">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Energia</h2>
            <div className="flex gap-2"><input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="text-xs border rounded p-1" /><input type="text" placeholder="Buscar Local/ID..." value={filterText} onChange={e => setFilterText(e.target.value)} className="text-xs border rounded p-1 flex-1" /></div>
        </div>
        <TableWithShowMore data={listFilter}>
            {(items:any[], Row:any) => (<><thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Data</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Local</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">ID</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Consumo</th><th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th></tr></thead><tbody className="divide-y">{items.map(item => (<Row key={item.id} onDelete={() => excluir(item.id)}><td className="px-3 py-2 text-gray-700">{U.formatDate(item.data)}</td><td className="px-3 py-2 text-gray-700 text-xs">{item.local}</td><td className="px-3 py-2 text-gray-700 text-xs">{item.medidor}</td><td className="px-3 py-2 font-bold text-yellow-600">{item.consumo} kWh</td></Row>))}</tbody></>)}
        </TableWithShowMore>
      </div>
    </div>
  );
}