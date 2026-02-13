import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FolderOpen, Paperclip, Camera, FileText, Send, ArrowRight, Reply, Search, Check, X, ChevronDown, Barcode, Eye, ScanBarcode, Download, Loader2 } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader, Input, TableWithShowMore, SearchableSelect } from '../components/ui/Shared';
import { U, getOperationalDateLimits } from '../utils';
import { toast } from 'react-hot-toast';
import { BarcodeScanner } from '../components/ui/BarcodeScanner';
import { CameraCapture } from '../components/ui/CameraCapture';
import { DanfePreview } from '../components/ui/DanfePreview';
import { BoletoPreview } from '../components/ui/BoletoPreview';
import { processBarcode, type ParsedBarcode, type NFeData, type BoletoData } from '../services/barcodeIntelligence';
import { exportAndUpload } from '../services/documentExporter';

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
  const { dados, dispatch, setTela, ativos, genericSave, userProfile } = useAppContext();
  
  // Lista de Setores para Tramitação
  const setores = ['Administrativo', 'Gerência Rural', 'Técnico', 'Financeiro', 'Diretoria', 'Campo (Operacional)'];

  const [form, setForm] = useState({ 
      id: '', 
      data: U.todayIso(), 
      tipo: '', 
      nome: '', 
      codigo: '', 
      valor: '',
      remetente: userProfile?.full_name || 'Usuário Atual', 
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

  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState('');

  // Estado do Preview de Documento Gerado (DANFE / Boleto)
  const [documentPreview, setDocumentPreview] = useState<ParsedBarcode | null>(null);
  const [processingBarcode, setProcessingBarcode] = useState(false);
  const [exportingDoc, setExportingDoc] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Manipulação de Arquivo (Upload Real)
  const handleFileSelect = async (e: any) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setFileSelected(file.name);
          setUploading(true);
          
          try {
            // Import dinâmico ou uso direto se importado no topo
            const { storageService } = await import('../services/storage');
            const url = await storageService.uploadFile(file, 'documents');
            
            if (url) {
                setFileUrl(url);
                toast.success("Arquivo enviado para nuvem!");
            } else {
                toast.error("Erro ao enviar arquivo.");
                setFileSelected('');
            }
          } catch (err) {
            console.error(err);
            toast.error("Falha no upload.");
          } finally {
            setUploading(false);
          }
      }
  };


  
  // Estado da Câmera (Foto do Documento)
  const [showCamera, setShowCamera] = useState(false);

  const handlePhotoSuccess = async (file: File, ocrResult?: any) => {
      // Upload automático da foto tirada
      setFileSelected(file.name);
      setUploading(true);
      setShowCamera(false);
      
      // Se tiver OCR, preenche o formulário com inteligência
      if (ocrResult) {
          const { fields, source } = ocrResult;
          
          let obsAuto = `[Lido via ${source === 'gemini' ? 'IA' : 'OCR'}]\n`;
          if (fields.emitente) obsAuto += `Emitente: ${fields.emitente}\n`;
          if (fields.produtos?.length > 0) {
              obsAuto += `Itens: ${fields.produtos.join(', ').substring(0, 100)}...\n`;
          }

          setForm(prev => ({
              ...prev,
              codigo: fields.chave || fields.cnpj || prev.codigo,
              obs: (prev.obs || '') + obsAuto,
              // Se tiver valor e o formulário estiver vazio, preenche
              valor: fields.total ? String(fields.total).replace('.', ',') : prev.valor,
          }));
          
          if (fields.total) toast.success(`Valor detectado: R$ ${fields.total}`, { icon: '💰' });
      }

      try {
        const { storageService } = await import('../services/storage');
        const url = await storageService.uploadFile(file, 'documents');
        
        if (url) {
            setFileUrl(url);
            toast.success("Foto salva e dados extraídos!", { icon: '✅' });
        }
      } catch (err) {
        toast.error("Falha ao salvar arquivo.");
      } finally {
        setUploading(false);
      }
  };

  /* 
  // Versão Anterior (Input Nativo) - Desativado em favor do Componente Visual
  const handleScanAction = () => {
      if (cameraInputRef.current) { cameraInputRef.current.click(); }
  };
  */

  const handleCameraCapture = (e: any) => {
      if (e.target.files && e.target.files[0]) {
          setFileSelected(`Foto_Scan_${U.todayIso()}.jpg`);
          setForm(prev => ({ ...prev, codigo: '3523 0908 9999 0001 2345 (OCR Lido)', obs: prev.obs + '\n[Sistema]: Texto extraído via OCR automaticamente.' }));
          toast.success("Documento digitalizado e OCR processado!");
      }
  };

  // Estado do Scanner
  const [showScanner, setShowScanner] = useState(false);

  const handleScanSuccess = async (code: string) => {
      setShowScanner(false);
      setProcessingBarcode(true);
      
      try {
        const result = await processBarcode(code);
        setDocumentPreview(result);
        
        if (result.type === 'nfe') {
          const nfe = result as NFeData;
          const nomeEmitente = nfe.fantasia || nfe.emitente || 'Emitente';
          setForm(prev => ({
            ...prev,
            tipo: 'Nota Fiscal',
            nome: `NF ${nfe.numero} - ${nomeEmitente}`,
            codigo: nfe.chave,
            obs: `NF-e Série ${nfe.serie} | CNPJ: ${nfe.cnpjFormatado} | ${nfe.ufSigla} | ${nfe.anoMes}`,
            destinatario: 'Financeiro'
          }));
          toast.success(`🧾 NF-e ${nfe.numero} detectada! ${nfe.emitente ? `Emitente: ${nomeEmitente}` : ''}`, { duration: 4000 });
        } else if (result.type === 'boleto_bancario' || result.type === 'boleto_convenio') {
          const boleto = result as BoletoData;
          setForm(prev => ({
            ...prev,
            tipo: 'Boleto',
            nome: `Boleto ${boleto.banco} - ${boleto.valorFormatado}`,
            codigo: boleto.codigoOriginal,
            valor: boleto.valor !== '0.00' ? boleto.valor : '',
            obs: `${boleto.banco} | Venc: ${boleto.vencimento}`,
            destinatario: 'Financeiro'
          }));
          toast.success(`💳 Boleto detectado! ${boleto.valorFormatado} - Venc: ${boleto.vencimento}`, { duration: 4000 });
        } else {
          setForm(prev => ({ ...prev, codigo: code }));
          toast.success('Código lido com sucesso!', { icon: '📷' });
        }
      } catch (err) {
        console.error('[Scan] Erro ao processar:', err);
        setForm(prev => ({ ...prev, codigo: code }));
        toast.success('Código lido (processamento parcial).', { icon: '⚠️' });
      } finally {
        setProcessingBarcode(false);
      }
  };

  // Exportar documento visual como imagem e vincular à OS
  const handleExportDocument = async () => {
      if (!previewRef.current || !documentPreview) return;
      setExportingDoc(true);
      try {
        const docName = documentPreview.type === 'nfe' ? 'DANFE' : 'Boleto';
        const url = await exportAndUpload(previewRef.current, docName);
        if (url) {
          setFileUrl(url);
          setFileSelected(`${docName}_${Date.now()}.jpg`);
          toast.success(`${docName} salvo como imagem! 📄`, { duration: 3000 });
        }
      } catch (err) {
        toast.error('Erro ao exportar documento.');
      } finally {
        setExportingDoc(false);
      }
  };

  // Modo Resposta
  const handleResponder = (docOriginal: any) => {
      setForm({
          id: '',
          data: U.todayIso(),
          tipo: 'Resposta / Anexo',
          nome: `Ref: ${docOriginal.nome}`,
          codigo: '',
          valor: '',
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
        arquivo: fileUrl ? fileUrl : (fileSelected || 'Sem anexo'), // Prioriza URL do Storage
        nome_arquivo: fileSelected, // Salva nome original
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
    
    // 2. Persistência OS (com foto anexada + dados OCR)
    genericSave('os', {
        id: U.id('OS-DOC-'),
        modulo: 'Documentos',
        descricao: descOS,
        detalhes: { 
           "Documento": form.nome,
           "Tipo": form.tipo,
           "Fluxo": fluxo,
           "Obs": form.obs || '-',
           ...(form.valor && { "Valor": `R$ ${form.valor}` }),
           ...(form.codigo && { "Chave/Código": form.codigo }),
        },
        arquivo_url: fileUrl || null,
        nome_arquivo: fileSelected || null,
        status: 'Pendente',
        data_abertura: new Date().toISOString()
    });
    
    setForm({ id: '', data: U.todayIso(), tipo: '', nome: '', codigo: '', valor: '', remetente: userProfile?.full_name || 'Usuário Atual', destinatario: '', obs: '', parentId: '' });
    setFileSelected('');
    setFileUrl(''); // Reset URL
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
      
       {/* PAINEL DE AÇÕES RÁPIDAS - Scanner é o principal */}
       <div className="grid grid-cols-3 gap-2">
          {/* BOTÃO PRINCIPAL: Scanner Inteligente */}
          <button type="button" onClick={() => setShowScanner(true)} className="flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl shadow-md hover:from-blue-100 hover:to-blue-200 active:scale-95 transition-all relative overflow-hidden">
              <div className="absolute top-1 right-1 bg-blue-500 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full">SMART</div>
              <ScanBarcode className="w-7 h-7 text-blue-600 mb-1" />
              <span className="text-[10px] font-bold text-blue-700 text-center">Ler Cód. Barras</span>
              <span className="text-[8px] text-blue-400 mt-0.5">NF-e • Boleto</span>
          </button>
          
          {/* Foto do Documento (Secundário) */}
          <button type="button" onClick={() => setShowCamera(true)} className="flex flex-col items-center justify-center p-3 bg-white border-2 border-purple-100 rounded-xl shadow-sm hover:bg-purple-50 active:scale-95 transition-all">
               <Camera className="w-6 h-6 text-purple-600 mb-1" />
               <span className="text-[10px] font-bold text-gray-600 text-center">Foto do Doc</span>
               <span className="text-[8px] text-gray-400 mt-0.5">Comprovante</span>
          </button>

          {/* Anexar Arquivo */}
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-3 bg-white border-2 border-purple-100 rounded-xl shadow-sm hover:bg-purple-50 active:scale-95 transition-all">
              <Paperclip className="w-6 h-6 text-gray-500 mb-1" />
              <span className="text-[10px] font-bold text-gray-600 text-center">Anexar Arquivo</span>
              <span className="text-[8px] text-gray-400 mt-0.5">PDF, Img</span>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
          </button>
      </div>

      {/* Modais */}
      {showCamera && (
          <CameraCapture onCapture={handlePhotoSuccess} onClose={() => setShowCamera(false)} />
      )}
      {showScanner && (
        <BarcodeScanner 
            onScanSuccess={handleScanSuccess} 
            onClose={() => setShowScanner(false)} 
        />
      )}

      {/* PREVIEW DO DOCUMENTO GERADO */}
      {processingBarcode && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm font-bold text-blue-700">Processando código de barras...</p>
          <p className="text-xs text-blue-400">Identificando tipo, extraindo dados e consultando CNPJ</p>
        </div>
      )}

      {documentPreview && !processingBarcode && (
        <div className="bg-gradient-to-b from-gray-50 to-white border-2 border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
              {documentPreview.type === 'nfe' ? '🧾' : '💳'}
              {documentPreview.type === 'nfe' ? 'DANFE Gerada' : 'Boleto Identificado'}
            </h3>
            <button onClick={() => setDocumentPreview(null)} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          {/* Renderiza Preview */}
          {documentPreview.type === 'nfe' && (
            <DanfePreview ref={previewRef} data={documentPreview as NFeData} />
          )}
          {(documentPreview.type === 'boleto_bancario' || documentPreview.type === 'boleto_convenio') && (
            <BoletoPreview ref={previewRef} data={documentPreview as BoletoData} />
          )}
          
          {/* Botão Exportar */}
          <button
            onClick={handleExportDocument}
            disabled={exportingDoc}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {exportingDoc ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Gerando imagem...</>
            ) : (
              <><Download className="w-5 h-5" /> Salvar Documento como Imagem</>
            )}
          </button>
        </div>
      )}

      {/* FORMULÁRIO */}
      <div className={`bg-white rounded-lg border-2 p-4 shadow-md transition-all ${isResponseMode ? 'border-yellow-400 ring-2 ring-yellow-100' : 'border-purple-200'}`}>
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700 flex items-center gap-2">
            {isResponseMode ? <Reply className="w-5 h-5 text-yellow-500"/> : <FileText className="w-5 h-5 text-purple-600"/>} 
            {isResponseMode ? 'Respondendo Documento' : 'Novo Registro / Envio'}
        </h2>
        
        <form onSubmit={enviar} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
             <Input 
                label="Data" 
                type="date" 
                value={form.data} 
                onChange={(e:any) => setForm({ ...form, data: e.target.value })} 
                required 
                readOnly={true}
                max={U.todayIso()}
                min={U.todayIso()}
             />
             <Input label="Código / Barras" placeholder="Auto ou Digite" value={form.codigo} onChange={(e:any) => setForm({ ...form, codigo: e.target.value })} />
          </div>

          <SearchableSelect label="Categoria" placeholder="Ex: Nota Fiscal, Contrato..." options={ativos.tiposDocumento} value={form.tipo} onChange={(e:any) => setForm({ ...form, tipo: e.target.value })} required color="purple" />
          <Input label="Nome do Arquivo / Assunto" placeholder="Descreva o documento" value={form.nome} onChange={(e:any) => setForm({ ...form, nome: e.target.value })} required />

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><Send className="w-3 h-3"/> Fluxo de Tramitação (Quem?)</p>
              <div className="flex items-center gap-2">
                  <div className="flex-1">
                      {/* REMETENTE FIXO (USUÁRIO LOGADO) */}
                      <Input 
                        label="De (Remetente)" 
                        value={form.remetente} 
                        readOnly={true}
                        className="bg-gray-200 text-gray-700 cursor-not-allowed border-gray-300 pointer-events-none"
                      />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 mt-5" />
                  <div className="flex-1">
                      <SearchableSelect 
                        label="Para (Destino)" 
                        /* Apenas Colaboradores, removido setores 'fake' */
                        options={Array.from(new Set([
                            ...(ativos?.colaboradores?.map((c:any) => c.nome) || [])
                        ])).filter(name => name !== form.remetente)} 
                        value={form.destinatario} 
                        onChange={(e:any) => setForm({...form, destinatario: e.target.value})} 
                        required 
                        color="purple" 
                      />
                  </div>
              </div>
          </div>

          <div className="flex items-center justify-between p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
             <div className="flex items-center gap-2">
                 <Paperclip className="w-5 h-5 text-gray-400" />
                 <span className="text-xs font-bold text-gray-600 truncate max-w-[150px]">
                    {uploading ? 'Enviando...' : (fileSelected || "Nenhum arquivo anexado")}
                 </span>
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
