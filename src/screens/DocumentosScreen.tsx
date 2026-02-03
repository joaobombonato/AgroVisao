import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FolderOpen, Paperclip, Camera, FileText, Send, ArrowRight, Reply, Search, Check, X, ChevronDown, Barcode, Eye } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader, Input, TableWithShowMore, SearchableSelect } from '../components/ui/Shared';
import { U } from '../data/utils';
import { toast } from 'react-hot-toast';

// ==========================================
// Componente: SELECT PESQUISÁVEL (Roxo)
// ==========================================
// ==========================================
// SEARCHABLE SELECT: IMPORTADO DO SHARED
// ==========================================

// ==========================================
// TELA PRINCIPAL: DOCUMENTOS
// ==========================================
export default function DocumentosScreen() {
  const { dados, dispatch, setTela, ativos, genericSave } = useAppContext();
  
  // Lista de Setores para Tramitação
  const setores = ['Administrativo', 'Gerência Rural', 'Técnico', 'Financeiro', 'Diretoria', 'Campo (Operacional)'];

  const [form, setForm] = useState({ 
      id: '', 
      data: U.todayIso(), 
      tipo: '', 
      nome: '', 
      codigo: '', 
      remetente: 'Gerência Rural', 
      destinatario: '', 
      obs: '',
      parentId: '' 
  });

  const [fileSelected, setFileSelected] = useState('');
  const [filterDate, setFilterDate] = useState(''); // Mantido filterDate conforme seu código
  const [filterText, setFilterText] = useState('');
  
  const [isResponseMode, setIsResponseMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Manipulação de Arquivo (Upload)
  const handleFileSelect = (e: any) => {
      if (e.target.files && e.target.files[0]) {
          setFileSelected(e.target.files[0].name);
          toast.success("Arquivo anexado com sucesso!");
      }
  };

  // Simulação de Scanner/OCR
  const handleScanAction = () => {
      if (cameraInputRef.current) {
          cameraInputRef.current.click();
      } else {
         toast("Abrindo Câmera / Scanner...", { icon: '📷' });
      }
  };

  const handleCameraCapture = (e: any) => {
      if (e.target.files && e.target.files[0]) {
          setFileSelected(`Foto_Scan_${U.todayIso()}.jpg`);
          setForm(prev => ({ ...prev, codigo: '3523 0908 9999 0001 2345 (OCR Lido)', obs: prev.obs + '\n[Sistema]: Texto extraído via OCR automaticamente.' }));
          toast.success("Documento digitalizado e OCR processado!");
      }
  };

  // Gerador de NF Rápido
  const handleGerarNF = () => {
      const codigoAleatorio = Math.floor(Math.random() * 1000000000000).toString();
      setForm(prev => ({
          ...prev,
          tipo: 'Nota Fiscal',
          nome: `NF Compra Diesel - Auto`,
          codigo: codigoAleatorio,
          obs: 'NF Gerada automaticamente pelo leitor de código de barras.',
          destinatario: 'Financeiro'
      }));
      toast.success("Dados da NF preenchidos via Código de Barras!");
  };

  // Modo Resposta
  const handleResponder = (docOriginal: any) => {
      setForm({
          id: '',
          data: U.todayIso(),
          tipo: 'Resposta / Anexo',
          nome: `Ref: ${docOriginal.nome}`,
          codigo: '',
          remetente: docOriginal.destinatario, // Quem recebeu agora responde
          destinatario: docOriginal.remetente, // Para quem enviou
          obs: '',
          parentId: docOriginal.id
      });
      setIsResponseMode(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast("Modo Resposta Ativado: Anexe o documento.", { icon: '↩️' });
  };

  // Visualizar Documento (Simulação)
  const handleVisualizar = (doc: any) => {
      if (!doc.arquivo || doc.arquivo === 'Sem anexo') {
          toast.error("Este documento não possui anexo digital.");
          return;
      }
      // Aqui entraria a lógica de abrir o PDF/Imagem do Firebase
      toast(`Abrindo visualizador para: ${doc.arquivo}`, { icon: '👁️', duration: 3000 });
  };

  const enviar = (e: any) => {
    e.preventDefault();
    if (!form.tipo || !form.nome || !form.remetente || !form.destinatario) {
        toast.error("Preencha Tipo, Nome, De e Para.");
        return;
    }

    const novo = { 
        ...form, 
        id: U.id('DOC-'), 
        arquivo: fileSelected || 'Sem anexo',
        status: 'Enviado'
    };
    
    const fluxo = `${form.remetente} > ${form.destinatario}`;
    const descOS = isResponseMode 
        ? `Resposta Doc (${fluxo}): ${form.nome}` 
        : `Envio Doc (${fluxo}): ${form.nome}`;

    // Table name: 'documents' (CONFIRMED)
    genericSave('documents', novo, { 
        type: ACTIONS.ADD_RECORD, 
        modulo: 'documentos', 
        osDescricao: descOS 
    });
    
    // 2. Persistência OS
    genericSave('os', {
        id: U.id('OS-DOC-'),
        modulo: 'Documentos',
        descricao: descOS,
        detalhes: { 
           "Documento": form.nome,
           "Tipo": form.tipo,
            "Fluxo": fluxo,
           "Obs": form.obs || '-'
        },
        status: 'Pendente',
        data_abertura: new Date().toISOString()
    });
    
    setForm({ id: '', data: U.todayIso(), tipo: '', nome: '', codigo: '', remetente: 'Gerência Rural', destinatario: '', obs: '', parentId: '' });
    setFileSelected('');
    setIsResponseMode(false);
    toast.success('Documento tramitado com sucesso!');
  };

  const excluir = (id: string) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir documento?', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'documentos', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  
  const docsFiltrados = useMemo(() => (dados.documentos || []).filter((i:any) => {
      return (!filterDate || i.data === filterDate) && 
             (!filterText || i.nome.toLowerCase().includes(filterText.toLowerCase()) || i.tipo.toLowerCase().includes(filterText.toLowerCase()));
  }).reverse(), [dados.documentos, filterDate, filterText]);

  const getBadgeColor = (tipo: string) => { 
      if (tipo === 'Nota Fiscal') return 'bg-blue-100 text-blue-800 border-blue-200'; 
      if (tipo.includes('Resposta')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      if (tipo === 'Boleto') return 'bg-red-100 text-red-800 border-red-200'; 
      return 'bg-gray-100 text-gray-800 border-gray-200'; 
  };

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Documentos & NF" icon={FolderOpen} colorClass="bg-purple-600" />
      
      {/* PAINEL DE AÇÕES RÁPIDAS */}
      <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={handleScanAction} className="flex flex-col items-center justify-center p-3 bg-white border-2 border-purple-100 rounded-xl shadow-sm hover:bg-purple-50 active:scale-95 transition-all">
              <Camera className="w-6 h-6 text-purple-600 mb-1" />
              <span className="text-[10px] font-bold text-gray-600 text-center">Escanear / Foto</span>
              <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handleCameraCapture} />
          </button>

          <button type="button" onClick={handleGerarNF} className="flex flex-col items-center justify-center p-3 bg-white border-2 border-purple-100 rounded-xl shadow-sm hover:bg-purple-50 active:scale-95 transition-all">
              <Barcode className="w-6 h-6 text-blue-600 mb-1" />
              <span className="text-[10px] font-bold text-gray-600 text-center">Gerar NF (Barras)</span>
          </button>

          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-3 bg-white border-2 border-purple-100 rounded-xl shadow-sm hover:bg-purple-50 active:scale-95 transition-all">
              <Paperclip className="w-6 h-6 text-gray-600 mb-1" />
              <span className="text-[10px] font-bold text-gray-600 text-center">Anexar Arquivo</span>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
          </button>
      </div>

      {/* FORMULÁRIO */}
      <div className={`bg-white rounded-lg border-2 p-4 shadow-md transition-all ${isResponseMode ? 'border-yellow-400 ring-2 ring-yellow-100' : 'border-purple-200'}`}>
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700 flex items-center gap-2">
            {isResponseMode ? <Reply className="w-5 h-5 text-yellow-500"/> : <FileText className="w-5 h-5 text-purple-600"/>} 
            {isResponseMode ? 'Respondendo Documento' : 'Novo Registro / Envio'}
        </h2>
        
        <form onSubmit={enviar} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
             <Input label="Data" type="date" value={form.data} onChange={(e:any) => setForm({ ...form, data: e.target.value })} required />
             <Input label="Código / Barras" placeholder="Auto ou Digite" value={form.codigo} onChange={(e:any) => setForm({ ...form, codigo: e.target.value })} />
          </div>

          <SearchableSelect label="Categoria" placeholder="Ex: Nota Fiscal, Contrato..." options={ativos.tiposDocumento} value={form.tipo} onChange={(e:any) => setForm({ ...form, tipo: e.target.value })} required color="purple" />
          <Input label="Nome do Arquivo / Assunto" placeholder="Descreva o documento" value={form.nome} onChange={(e:any) => setForm({ ...form, nome: e.target.value })} required />

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><Send className="w-3 h-3"/> Fluxo de Tramitação</p>
              <div className="flex items-center gap-2">
                  <div className="flex-1">
                      <SearchableSelect label="De (Remetente)" options={setores} value={form.remetente} onChange={(e:any) => setForm({...form, remetente: e.target.value})} required color="purple" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 mt-5" />
                  <div className="flex-1">
                      <SearchableSelect label="Para (Destino)" options={setores} value={form.destinatario} onChange={(e:any) => setForm({...form, destinatario: e.target.value})} required color="purple" />
                  </div>
              </div>
          </div>

          <div className="flex items-center justify-between p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
             <div className="flex items-center gap-2">
                 <Paperclip className="w-5 h-5 text-gray-400" />
                 <span className="text-xs font-bold text-gray-600 truncate max-w-[150px]">{fileSelected || "Nenhum arquivo anexado"}</span>
             </div>
             {!fileSelected && <span className="text-[10px] text-purple-600 font-bold cursor-pointer" onClick={() => fileInputRef.current?.click()}>SELECIONAR</span>}
             {fileSelected && <X className="w-4 h-4 text-red-500 cursor-pointer" onClick={() => setFileSelected('')} />}
          </div>

          {form.obs && (
              <div className="p-2 bg-yellow-50 text-xs text-yellow-800 rounded border border-yellow-200">
                  <strong>Obs do Sistema:</strong> {form.obs}
              </div>
          )}

          <div className="flex gap-2 pt-2">
              {isResponseMode && (
                  <button type="button" onClick={() => { setIsResponseMode(false); setForm({...form, parentId: '', nome: '', tipo: ''}); }} className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold">Cancelar</button>
              )}
              <button type="submit" className={`flex-1 ${isResponseMode ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-purple-600 hover:bg-purple-700'} text-white py-3 rounded-lg font-bold shadow-md flex items-center justify-center gap-2`}>
                  {isResponseMode ? <Reply className="w-5 h-5"/> : <Check className="w-5 h-5"/>} 
                  {isResponseMode ? 'Enviar Resposta' : 'Registrar Documento'}
              </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg border-2 overflow-hidden shadow-sm">
        <div className="p-3 border-b bg-gray-50">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Central de Documentos</h2>
            <div className="flex gap-2">
                {/* CORREÇÃO DO ERRO DE DIGITAÇÃO AQUI */}
                <Input 
                    type="date" 
                    value={filterDate} 
                    onChange={(e: any) => setFilterDate(e.target.value)} 
                    className="text-xs border rounded p-2" 
                />
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400"/>
                    <input type="text" placeholder="Buscar..." value={filterText} onChange={e => setFilterText(e.target.value)} className="w-full pl-8 text-xs border rounded p-2" />
                </div>
            </div>
        </div>
        <TableWithShowMore data={docsFiltrados}>
            {(items:any[], Row:any) => (
                <>
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Doc / Info</th>
                            <th className="px-3 py-2 text-center text-xs font-bold text-gray-500">Tramitação</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {items.map(item => (
                            <Row key={item.id} onDelete={() => excluir(item.id)}>
                                <td className="px-3 py-2 text-gray-700">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getBadgeColor(item.tipo)}`}>{item.tipo}</span>
                                        <span className="text-[10px] text-gray-400">{U.formatDate(item.data)}</span>
                                    </div>
                                    <div className="font-bold text-sm text-gray-800 leading-tight">{item.nome}</div>
                                    {item.codigo && <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-1"><Barcode className="w-3 h-3"/> {item.codigo}</div>}
                                    {/* Link visual para o anexo */}
                                    {item.arquivo && item.arquivo !== 'Sem anexo' && (
                                        <div className="text-[10px] text-blue-600 flex items-center gap-1 mt-0.5 cursor-pointer hover:underline" onClick={() => handleVisualizar(item)}>
                                            <Paperclip className="w-3 h-3"/> {item.arquivo}
                                        </div>
                                    )}
                                </td>
                                
                                <td className="px-3 py-2 text-center">
                                    <div className="flex flex-col items-center justify-center text-[10px] font-medium text-gray-600 bg-gray-50 p-1 rounded border">
                                        <span>{item.remetente || 'Rural'}</span>
                                        <ArrowRight className="w-3 h-3 text-gray-400 my-0.5" />
                                        <span>{item.destinatario || 'Adm'}</span>
                                    </div>
                                    {item.parentId && <span className="text-[9px] bg-yellow-100 text-yellow-800 px-1 rounded mt-1 inline-block">Resposta</span>}
                                </td>

                                <td className="px-3 py-2 text-right">
                                    <div className="flex justify-end gap-1">
                                        {/* BOTÃO NOVO: VISUALIZAR */}
                                        <button 
                                            onClick={() => handleVisualizar(item)}
                                            className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors inline-flex"
                                            title="Visualizar Anexo"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>

                                        <button 
                                            onClick={() => handleResponder(item)}
                                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors inline-flex"
                                            title="Responder / Anexar"
                                        >
                                            <Reply className="w-4 h-4" />
                                        </button>
                                    </div>
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