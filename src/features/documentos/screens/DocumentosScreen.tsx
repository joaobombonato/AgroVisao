import React, { useState, useMemo, useRef } from 'react';
import { FolderOpen, FileText, Send, ArrowRight, Reply, Search, Check } from 'lucide-react';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { PageHeader, Input, SearchableSelect } from '../../../components/ui/Shared';
import { U } from '../../../utils';
import { toast } from 'react-hot-toast';

// Componentes Refatorados
import { BarcodeScanner } from '../components/BarcodeScanner';
import { CameraCapture } from '../components/CameraCapture';
import { DocumentosActionPanel } from '../components/DocumentosActionPanel';
import { GeneratedDocumentPreview } from '../components/GeneratedDocumentPreview';
import { AttachmentList } from '../components/AttachmentList';
import { DocumentosList } from '../components/DocumentosList';

// Hooks Personalizados
import { useAttachments } from '../hooks/useAttachments';
import { useBarcodeScanning } from '../hooks/useBarcodeScanning';

export default function DocumentosScreen() {
  const { dados, dispatch, setTela, ativos, genericSave, userProfile } = useAppContext();
  
  // ===============================================
  // ESTADOS DO FORMULÁRIO (Mantido local por simplicidade)
  // ===============================================
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

  const [filterDate, setFilterDate] = useState(U.todayIso());
  const [filterText, setFilterText] = useState('');
  const [isResponseMode, setIsResponseMode] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  const previewRef = useRef<HTMLDivElement>(null);

  // ===============================================
  // HOOKS (Lógica Extraída)
  // ===============================================
  const { 
    attachments, 
    setAttachments,
    handleFileSelect, 
    addCameraAttachment, 
    handleExportDocument, 
    handleDownload, 
    removeAttachment,
    clearAttachments,
    uploading,
    fileInputRef,
    exportingDoc
  } = useAttachments();

  const {
    showScanner, setShowScanner,
    scanMode, setScanMode,
    showScanSelector, setShowScanSelector,
    processingBarcode,
    documentPreview, setDocumentPreview,
    handleScanSuccess,
    handleDanfeDataChange,
    handleBoletoDataChange
  } = useBarcodeScanning(setForm);

  // ===============================================
  // HANDLERS ESPECÍFICOS DA TELA
  // ===============================================

  const handlePhotoSuccess = async (file: File, ocrResult?: any) => {
    setShowCamera(false);
    
    // OCR Logic (Poderia ser extraído também, mas é curto o suficiente aqui ou mover para helper)
    if (ocrResult && ocrResult.fields) {
        const { fields, source } = ocrResult;
        let obsAuto = `[Lido via ${source === 'gemini' ? 'IA' : 'OCR'}]\n`;
        if (fields.emitente) obsAuto += `Emitente: ${fields.emitente}\n`;
        if (fields.produtos?.length > 0) obsAuto += `Itens: ${fields.produtos.join(', ').substring(0, 100)}...\n`;

        setForm(prev => ({
            ...prev,
            codigo: fields.chave || fields.cnpj || prev.codigo,
            obs: (prev.obs || '') + obsAuto,
            valor: fields.total ? String(fields.total).replace('.', ',') : prev.valor,
        }));
        if (fields.total) toast.success(`Valor detectado: R$ ${fields.total}`, { icon: '💰' });
    }

    await addCameraAttachment(file);
  };

  const handleResponder = (docOriginal: any) => {
      setForm({
          id: '',
          data: U.todayIso(),
          tipo: 'Resposta / Anexo',
          nome: `Ref: ${docOriginal.nome}`,
          codigo: '',
          valor: '',
          remetente: docOriginal.destinatario,
          destinatario: docOriginal.remetente,
          obs: '',
          parentId: docOriginal.id
      });
      clearAttachments();
      setIsResponseMode(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast("Modo Resposta Ativado: Anexe o documento.", { icon: '↩️' });
  };

  const handleVisualizar = (doc: any) => {
      if (!doc.arquivo || doc.arquivo === 'Sem anexo') {
          toast.error("Este documento não possui anexo digital.");
          return;
      }
      const urls = doc.arquivo.split(',');
      if (urls.length === 1) {
          window.open(urls[0], '_blank');
      } else {
          toast(`O documento possui ${urls.length} anexos. Abrindo...`, { icon: '📂' });
          urls.forEach((u: string) => window.open(u.trim(), '_blank'));
      }
  };

  const enviar = (e: any) => {
    e.preventDefault();
    if (!form.tipo || !form.nome || !form.remetente || !form.destinatario) {
        toast.error("Preencha Tipo, Nome, De e Para.");
        return;
    }

    const fileUrls = attachments.map(a => a.url).join(',');
    const fileNames = attachments.map(a => a.name).join(', ');

    const novo = { 
        ...form, 
        id: U.id('DOC-'), 
        arquivo: fileUrls || 'Sem anexo', 
        nome_arquivo: fileNames, 
        status: 'Enviado'
    };
    
    const fluxo = `${form.remetente} > ${form.destinatario}`;
    const descOS = isResponseMode ? `Resposta Doc (${fluxo}): ${form.nome}` : `Envio Doc (${fluxo}): ${form.nome}`;

    genericSave('documents', novo, { type: ACTIONS.ADD_RECORD, modulo: 'documentos', osDescricao: descOS });
    
    // Vincula à OS
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
           "Anexos": fileNames || 'Nenhum'
        },
        arquivo_url: fileUrls || null,
        nome_arquivo: fileNames || null,
        status: 'Pendente',
        data_abertura: new Date().toISOString()
    });
    
    setForm({ id: '', data: U.todayIso(), tipo: '', nome: '', codigo: '', valor: '', remetente: userProfile?.full_name || 'Usuário Atual', destinatario: '', obs: '', parentId: '' });
    clearAttachments();
    setIsResponseMode(false);
    toast.success('Documento tramitado com sucesso!');
  };

  const excluir = (id: string) => { 
      dispatch({ 
        type: ACTIONS.SET_MODAL, 
        modal: { 
            isOpen: true, 
            message: 'Excluir documento?', 
            onConfirm: () => { 
                dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'documentos', id }); 
                dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); 
                toast.error('Registro excluído.'); 
            } 
        } 
      }); 
  };
  
  const docsFiltrados = useMemo(() => (dados.documentos || []).filter((i:any) => {
      return (!filterDate || i.data === filterDate) && 
             (!filterText || i.nome.toLowerCase().includes(filterText.toLowerCase()) || i.tipo.toLowerCase().includes(filterText.toLowerCase()));
  }).reverse(), [dados.documentos, filterDate, filterText]);

  // ===============================================
  // REGRA DE NEGÓCIO: CATEGORIAS E UX
  // ===============================================
  const categoriasDocs = useMemo(() => {
    const dbTypes = ativos.tiposDocumento || [];
    return dbTypes.map((t: any) => typeof t === 'string' ? t : (t.nome || t.label));
  }, [ativos.tiposDocumento]);

  // ===============================================
  // RENDER
  // ===============================================
  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Documentos & NF" icon={FolderOpen} colorClass="bg-purple-600" />
      
      {/* 1. Painel de Ações */}
      <DocumentosActionPanel 
        setShowScanSelector={setShowScanSelector}
        showScanSelector={showScanSelector}
        setScanMode={setScanMode}
        setShowScanner={setShowScanner}
        setShowCamera={setShowCamera}
        onAttachClick={() => fileInputRef.current?.click()}
      />
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />

      {/* 2. Modais e Overlays */}
      {showCamera && <CameraCapture onCapture={handlePhotoSuccess} onClose={() => setShowCamera(false)} />}
      {showScanner && <BarcodeScanner onScanSuccess={handleScanSuccess} onClose={() => setShowScanner(false)} scanMode={scanMode} />}

      {/* 3. Preview do Documento Gerado */}
      <GeneratedDocumentPreview 
        ref={previewRef}
        documentPreview={documentPreview!}
        processingBarcode={processingBarcode}
        onClose={() => setDocumentPreview(null)}
        onDanfeDataChange={handleDanfeDataChange}
        onBoletoDataChange={handleBoletoDataChange}
        onDownload={() => handleDownload(previewRef.current, documentPreview?.type || 'doc')}
        onExport={() => handleExportDocument(previewRef.current, documentPreview?.type || 'doc')}
        exporting={exportingDoc}
      />

      {/* 4. Formulário de Envio */}
      <div className={`bg-white rounded-lg border-2 p-4 shadow-md transition-all ${isResponseMode ? 'border-yellow-400 ring-2 ring-yellow-100' : 'border-purple-200'}`}>
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700 flex items-center gap-2">
            {isResponseMode ? <Reply className="w-5 h-5 text-yellow-500"/> : <FileText className="w-5 h-5 text-purple-600"/>} 
            {isResponseMode ? 'Respondendo Documento' : 'Novo Registro / Envio'}
        </h2>
        
        <form onSubmit={enviar} className="space-y-3">
          <div className="space-y-3">
             <Input label="Data" type="date" value={form.data} onChange={(e:any) => setForm({ ...form, data: e.target.value })} required readOnly={true} />
             <Input 
                label="Código / Barras" 
                placeholder="Auto ou Digite" 
                value={form.codigo} 
                onChange={(e:any) => setForm({ ...form, codigo: e.target.value })} 
             />
          </div>

          <SearchableSelect 
            label="Categoria" 
            placeholder="Ex: Nota Fiscal..." 
            options={categoriasDocs} 
            value={form.tipo} 
            onChange={(e:any) => setForm({ ...form, tipo: e.target.value })} 
            required 
            color="purple" 
          />
          
          <Input label="Nome do Arquivo / Assunto" placeholder="Descreva o documento" value={form.nome} onChange={(e:any) => setForm({ ...form, nome: e.target.value })} required />

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><Send className="w-3 h-3"/> Fluxo de Tramitação</p>
              <div className="flex items-center gap-2">
                  <div className="flex-1">
                      <Input label="De" value={form.remetente} readOnly={true} className="bg-gray-200 text-gray-700 cursor-not-allowed border-gray-300 pointer-events-none text-[12px]" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 mt-5" />
                  <div className="flex-1">
                      <SearchableSelect 
                        label="Para" 
                        options={Array.from(new Set([...(ativos?.colaboradores?.map((c:any) => c.nome) || [])])).filter(name => name !== form.remetente)} 
                        value={form.destinatario} 
                        onChange={(e:any) => setForm({...form, destinatario: e.target.value})} 
                        required 
                        color="purple" 
                      />
                  </div>
              </div>
          </div>

          <AttachmentList 
            attachments={attachments}
            onRemove={removeAttachment}
            onAddClick={() => fileInputRef.current?.click()}
            uploading={uploading}
          />

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

      {/* 5. Lista de Documentos */}
      <div className="bg-white rounded-lg border-2 overflow-hidden shadow-sm">
        <div className="p-3 border-b bg-gray-50">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Documentos</h2>
            <div className="flex flex-col sm:flex-row gap-2">
                 <Input type="date" value={filterDate} onChange={(e: any) => setFilterDate(e.target.value)} className="text-xs border rounded p-2 min-w-[140px]" />
                 <div className="relative flex-1 min-w-[120px]">
                     <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400"/>
                     <input type="text" placeholder="Buscar..." value={filterText} onChange={e => setFilterText(e.target.value)} className="w-full pl-8 text-xs border rounded p-2" />
                 </div>
            </div>
        </div>
        <DocumentosList 
            data={docsFiltrados}
            onExcluir={excluir}
            onVisualizar={handleVisualizar}
            onResponder={handleResponder}
        />
      </div>
    </div>
  );
}
