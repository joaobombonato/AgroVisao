import React, { useState, useMemo, useRef } from 'react';
import { FolderOpen, Paperclip } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader, Input, Select, TableWithShowMore } from '../components/ui/Shared';
import { U } from '../data/utils';
import { toast } from 'react-hot-toast';

export default function DocumentosScreen() {
  const { dados, dispatch, setTela, ativos } = useAppContext();
  const [form, setForm] = useState({ tipo: '', nome: '', codigo: '', data: U.todayIso() });
  const [filterDate, setFilterDate] = useState('');
  const [filterText, setFilterText] = useState('');
  const [fileSelected, setFileSelected] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: any) => {
      if (e.target.files && e.target.files[0]) {
          setFileSelected(e.target.files[0].name);
          toast.success("Arquivo selecionado!");
      }
  };

  const enviar = (e: any) => {
    e.preventDefault();
    const novo = { ...form, id: U.id('DOC-'), arquivo: fileSelected };
    dispatch({ type: ACTIONS.ADD_RECORD, modulo: 'documentos', record: novo, osDescricao: `${form.tipo}: ${form.nome}` });
    setForm({ tipo: '', nome: '', codigo: '', data: U.todayIso() });
    setFileSelected('');
    toast.success('Documento registrado!');
  };
  const excluir = (id: string) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir documento?', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'documentos', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  const docsFiltrados = useMemo(() => (dados.documentos || []).filter((i:any) => (!filterDate || i.data === filterDate) && (!filterText || i.nome.toLowerCase().includes(filterText.toLowerCase()) || i.tipo.toLowerCase().includes(filterText.toLowerCase()))).reverse(), [dados.documentos, filterDate, filterText]);
  const getBadgeColor = (tipo: string) => { if (tipo === 'Nota Fiscal') return 'bg-blue-100 text-blue-800'; if (tipo === 'Boleto') return 'bg-red-100 text-red-800'; return 'bg-gray-100 text-gray-800'; };

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Documentos" icon={FolderOpen} colorClass="bg-purple-500" />
      <div className="bg-white rounded-lg border-2 p-4">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700">Registro de Documentos</h2>
        <form onSubmit={enviar} className="space-y-3">
          <Input label="Data" type="date" value={form.data} onChange={(e:any) => setForm({ ...form, data: e.target.value })} required />
          <Select label="Categoria de Arquivo" value={form.tipo} onChange={(e:any) => setForm({ ...form, tipo: e.target.value })} required>
             <option value="">Selecione...</option>{ativos.tiposDocumento.map((t:string) => <option key={t}>{t}</option>)}
          </Select>
          <Input label="Nome do Arquivo" placeholder="Informar nome" value={form.nome} onChange={(e:any) => setForm({ ...form, nome: e.target.value })} required />
          <Input label="Código" placeholder="Código de Barras/Identificador" value={form.codigo} onChange={(e:any) => setForm({ ...form, codigo: e.target.value })} />
          <div onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
              <div className="text-center">
                  <Paperclip className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-1 text-xs text-gray-500">{fileSelected || "Anexar Arquivo (Foto/PDF)"}</p>
              </div>
          </div>
          <button type="submit" className="w-full bg-purple-500 text-white py-3 rounded-lg font-medium">Registrar</button>
        </form>
      </div>
      <div className="bg-white rounded-lg border-2 overflow-x-auto">
        <div className="p-3 border-b bg-gray-50 rounded-t-lg">
             <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Documentos</h2>
             <div className="flex gap-2"><input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="text-xs border rounded p-1" /><input type="text" placeholder="Buscar Categoria/Nome..." value={filterText} onChange={e => setFilterText(e.target.value)} className="text-xs border rounded p-1 flex-1" /></div>
        </div>
        <TableWithShowMore data={docsFiltrados}>
            {(items:any[], Row:any) => (<><thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Data</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Categoria</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Nome</th><th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th></tr></thead><tbody className="divide-y">{items.map(item => (<Row key={item.id} onDelete={() => excluir(item.id)}><td className="px-3 py-2 text-gray-700">{U.formatDate(item.data)}</td><td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-bold ${getBadgeColor(item.tipo)}`}>{item.tipo}</span></td><td className="px-3 py-2 text-gray-700">{item.nome}</td></Row>))}</tbody></>)}
        </TableWithShowMore>
      </div>
    </div>
  );
}