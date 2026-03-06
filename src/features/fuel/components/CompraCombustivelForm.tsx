import React, { useState, useEffect } from 'react';
import { Fuel, X, Plus, Minus, Check, Search, ScanBarcode, CreditCard, History, ArrowRight, Camera, FileText, ChevronRight, ChevronLeft, Send } from 'lucide-react';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { Input, SearchableSelect } from '../../../components/ui/Shared';
import { U } from '../../../utils';
import { toast } from 'react-hot-toast';
import { lookupCNPJ, processBarcode, type NFeData, type BoletoData } from '../../documentos/services/barcodeIntelligence';
import { BarcodeScanner } from '../../documentos/components/BarcodeScanner';
import { CameraCapture } from '../../documentos/components/CameraCapture';
import { AttachmentList } from '../../documentos/components/AttachmentList';
import { useAttachments } from '../../documentos/hooks/useAttachments';

interface CompraCombustivelFormProps {
  onClose: () => void;
}

type ScanTarget = 'dieselNfe' | 'dieselBoleto' | 'freteNfe' | 'freteBoleto';

export function CompraCombustivelForm({ onClose }: CompraCombustivelFormProps) {
  const { dados, dispatch, genericSave, userProfile, ativos } = useAppContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState({ 
    data: U.todayIso(), 
    fornecedor: '',
    cnpjFornecedor: '',
    notaFiscal: '', 
    vencimentoDiesel: '',
    chaveNfeDiesel: '',
    codigoBoletoDiesel: '',
    litros: '', 
    valorUnitario: '', 
    fornecedorFrete: '',
    cnpjFornecedorFrete: '',
    nfFrete: '',
    valorFrete: '',
    vencimentoFrete: '',
    chaveNfeFrete: '',
    codigoBoletoFrete: '',
    valorTotal: '',
    destinatario: ''
  });
  
  const [showFrete, setShowFrete] = useState(false);
  const [loadingCNPJ, setLoadingCNPJ] = useState({ fuel: false, frete: false });
  const [showScanner, setShowScanner] = useState(false);
  const [scanTarget, setScanTarget] = useState<ScanTarget | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const { 
    attachments, 
    handleFileSelect, 
    addCameraAttachment, 
    removeAttachment,
    uploading,
    fileInputRef
  } = useAttachments();

  useEffect(() => {
    const l = U.parseDecimal(form.litros) || 0;
    const v = U.parseDecimal(form.valorUnitario) || 0;
    const total = l * v;
    setForm(prev => ({ ...prev, valorTotal: total.toFixed(2) }));
  }, [form.litros, form.valorUnitario]);

  // Rateio do Frete
  const valorUnitarioFinal = () => {
      const l = U.parseDecimal(form.litros) || 0;
      const v = U.parseDecimal(form.valorUnitario) || 0;
      const f = showFrete ? (U.parseDecimal(form.valorFrete) || 0) : 0;
      if (l === 0) return v;
      return v + (f / l);
  };

  const valorTotalGeral = () => {
      const l = U.parseDecimal(form.litros) || 0;
      const uf = valorUnitarioFinal();
      return l * uf;
  };

  const setDadosManuais = (dados: any) => setForm(prev => ({...prev, ...dados}));

  const nextStep = () => setCurrentStep(p => p + 1);
  const prevStep = () => setCurrentStep(p => p - 1);

  const handleLookup = async (type: 'fuel' | 'frete') => {
    const cnpj = type === 'fuel' ? form.cnpjFornecedor : form.cnpjFornecedorFrete;
    const clean = cnpj ? cnpj.replace(/\D/g, '') : '';
    if (clean.length !== 14) return;
    
    setLoadingCNPJ(prev => ({ ...prev, [type]: true }));
    try {
        const result = await lookupCNPJ(clean);
        if (result) {
            setForm(prev => ({
                ...prev,
                [type === 'fuel' ? 'fornecedor' : 'fornecedorFrete']: result.razaoSocial || result.fantasia
            }));
            toast.success('Fornecedor localizado!');
        }
    } catch (e) {
        toast.error('Erro ao consultar CNPJ');
    } finally {
        setLoadingCNPJ(prev => ({ ...prev, [type]: false }));
    }
  };

  const openScanner = (target: ScanTarget) => {
    setScanTarget(target);
    setShowScanner(true);
  };

  const handleScanSuccess = async (code: string) => {
    setShowScanner(false);
    try {
        const hint = scanTarget?.includes('Nfe') ? 'nfe' : 'boleto';
        const result = await processBarcode(code, hint as any);
        
        if (scanTarget?.includes('Nfe')) {
            if (result.type !== 'nfe') {
                toast.error('O código lido não parece ser uma NF-e.');
                return;
            }
            const nfe = result as NFeData;
            const isDiesel = scanTarget === 'dieselNfe';
            
            setForm(prev => ({
                ...prev,
                data: nfe.dataEmissaoIso || prev.data,
                [isDiesel ? 'cnpjFornecedor' : 'cnpjFornecedorFrete']: nfe.cnpjFormatado,
                [isDiesel ? 'fornecedor' : 'fornecedorFrete']: nfe.emitente || nfe.fantasia || (isDiesel ? prev.fornecedor : prev.fornecedorFrete),
                [isDiesel ? 'notaFiscal' : 'nfFrete']: nfe.numero,
                [isDiesel ? 'chaveNfeDiesel' : 'chaveNfeFrete']: nfe.chave
            }));
            toast.success(`NF-e ${nfe.numero} detectada! Data: ${nfe.anoMes}`);
        } else if (scanTarget?.includes('Boleto')) {
            if (result.type !== 'boleto_bancario' && result.type !== 'boleto_convenio') {
                toast.error('O código lido não parece ser um boleto.');
                return;
            }
            const boleto = result as BoletoData;
            const isDiesel = scanTarget === 'dieselBoleto';

            setForm(prev => ({
                ...prev,
                [isDiesel ? 'vencimentoDiesel' : 'vencimentoFrete']: boleto.vencimentoIso || prev[isDiesel ? 'vencimentoDiesel' : 'vencimentoFrete'],
                [isDiesel ? 'codigoBoletoDiesel' : 'codigoBoletoFrete']: boleto.codigoBarras,
                [isDiesel ? 'valorTotal' : 'valorFrete']: (isDiesel && boleto.valor !== '0.00') ? boleto.valor : prev[isDiesel ? 'valorTotal' : 'valorFrete']
            }));
            toast.success(`Boleto detectado! Venc: ${boleto.vencimento}`);
        }
    } catch (e) {
        toast.error('Erro ao processar código');
    }
  };

  const handlePhotoSuccess = async (file: File) => {
    setShowCamera(false);
    await addCameraAttachment(file);
  };

  const enviar = (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    if (!form.litros || !form.valorUnitario || !form.notaFiscal) {
      toast.error("Preencha Nota Fiscal, Litros e Valor");
      return;
    }
    
    // 1. Salva a Compra (Estoque com Valor Rateado)
    genericSave('compras', { 
      data: form.data,
      produto: 'Diesel S10',
      litros: U.parseDecimal(form.litros),
      valor_total: valorTotalGeral(), // VALOR TOTAL (DIESEL + FRETE)
      valor_unitario: valorUnitarioFinal(), // PREÇO UNITÁRIO COM FRETE DILUÍDO
      fornecedor: form.fornecedor,
      nota_fiscal: form.notaFiscal,
      cnpj_fornecedor: form.cnpjFornecedor,
      vencimento_diesel: form.vencimentoDiesel || null,
      chave_nfe_diesel: form.chaveNfeDiesel || null,
      codigo_boleto_diesel: form.codigoBoletoDiesel || null,
      fornecedor_frete: form.fornecedorFrete,
      cnpj_fornecedor_frete: form.cnpjFornecedorFrete,
      nf_frete: form.nfFrete,
      valor_frete: U.parseDecimal(form.valorFrete),
      vencimento_frete: form.vencimentoFrete || null,
      chave_nfe_frete: form.chaveNfeFrete || null,
      codigo_boleto_frete: form.codigoBoletoFrete || null,
      tipo: 'combustivel'
    }, { type: ACTIONS.ADD_RECORD, modulo: 'compras' });
    
    // 2. Cria OS Compra (Mural de Compras - Independente do destinatario de PDF)
    const descOS = `Compra Diesel: ${form.litros}L (NF: ${form.notaFiscal})`;
    genericSave('os', {
        modulo: 'Compra Diesel',
        descricao: descOS,
        detalhes: { "Fornecedor": form.fornecedor || '-', "Litros": `${form.litros} L`, "Venc.": form.vencimentoDiesel || 'n/i' },
        status: 'Pendente',
        data_abertura: form.data,
        created_by: userProfile?.id || null
    }, { type: ACTIONS.ADD_RECORD, modulo: 'os' });

    // 3. Tramita Documentos (NF, Boletos e Ticket) para a lista "Documentos" do usuário selecionado no passo 5
    const fileUrls = attachments.map(a => a.url).join(',');
    const fileNames = attachments.map(a => a.name).join(', ');

    const docsToCreate = [];
    if (form.notaFiscal) docsToCreate.push({ type: 'NF Diesel', code: form.chaveNfeDiesel || form.notaFiscal, val: U.parseDecimal(form.valorTotal), for: form.fornecedor, venc: form.vencimentoDiesel, isAtt: false });
    if (form.codigoBoletoDiesel) docsToCreate.push({ type: 'Boleto Diesel', code: form.codigoBoletoDiesel, val: U.parseDecimal(form.valorTotal), for: form.fornecedor, venc: form.vencimentoDiesel, isAtt: false });
    if (showFrete && form.nfFrete) docsToCreate.push({ type: 'NF Frete', code: form.chaveNfeFrete || form.nfFrete, val: U.parseDecimal(form.valorFrete), for: form.fornecedorFrete, venc: form.vencimentoFrete, isAtt: false });
    if (showFrete && form.codigoBoletoFrete) docsToCreate.push({ type: 'Boleto Frete', code: form.codigoBoletoFrete, val: U.parseDecimal(form.valorFrete), for: form.fornecedorFrete, venc: form.vencimentoFrete, isAtt: false });
    if (attachments.length > 0) docsToCreate.push({ type: 'Ticket Balança', code: form.notaFiscal, val: 0, for: form.fornecedor, venc: '', isAtt: true });

    const fluxo = `${userProfile?.full_name || 'Usuário Atual'} > ${form.destinatario}`;

    docsToCreate.forEach(d => {
        genericSave('documents', {
            titulo: d.isAtt ? `Ticket de Balança (Diesel ${d.code})` : `${d.type}: ${d.code.substring(0, 10)} - ${d.for}`,
            nome: d.isAtt ? `Ticket de Balança (Diesel ${d.code})` : `${d.type}: ${d.code.substring(0, 10)} - ${d.for}`,
            tipo: d.isAtt ? 'Ticket/Recibo' : (d.type.includes('NF') ? 'Nota Fiscal' : 'Boleto'),
            url: d.isAtt ? fileUrls : 'Vínculo Automático (Diesel)', 
            nome_arquivo: d.isAtt ? fileNames : null,
            descricao: `Vínculo Automático Compra Diesel | Info: ${d.code}`,
            data: form.data,
            remetente: userProfile?.full_name || 'Usuário Atual',
            destinatario: form.destinatario,
            status: 'Enviado'
        }, { type: ACTIONS.ADD_RECORD, modulo: 'documentos' });

        genericSave('os', {
            modulo: 'Documentos',
            descricao: `DOC: ${d.type} (${d.for || 'Diesel'})`,
            detalhes: { "Tipo": d.type, "Fluxo": fluxo, "Vencimento": d.venc || '-', "Valor": `R$ ${d.val}` },
            status: 'Pendente',
            data_abertura: form.data,
            created_by: userProfile?.id || null 
        }, { type: ACTIONS.ADD_RECORD, modulo: 'os' });
    });
    
    toast.success('Compra e todos os Documentos processados!');
    onClose();
  };

  const ScanButton = ({ label, target, colorClass }: { label: string, target: ScanTarget, colorClass: string }) => (
    <button type="button" onClick={() => openScanner(target)} className={`flex-1 w-full flex font-bold text-sm items-center justify-center gap-2 py-3 px-3 rounded-xl transition-all active:scale-95 ${colorClass} shadow-md border hover:-translate-y-0.5`}>
      <ScanBarcode className="w-5 h-5" /> {label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm overflow-hidden">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
        <div className="flex justify-between items-center border-b p-4 bg-green-50 rounded-t-2xl shrink-0">
          <div className="flex flex-col">
              <h2 className="text-lg font-bold flex items-center gap-2 text-green-800"><Fuel className="w-5 h-5" /> Compra de Diesel</h2>
              <span className="text-[10px] uppercase font-bold text-green-600">Passo {currentStep} de 6</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-green-200 text-green-800 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        
        {/* Barra de Progresso */}
        <div className="h-1.5 w-full bg-gray-100 flex">
            {[1, 2, 3, 4, 5, 6].map(s => (
                <div key={s} className={`h-full flex-1 transition-colors duration-500 ${s <= currentStep ? 'bg-green-500' : 'bg-transparent'} ${s !== 6 ? 'border-r border-white/30' : ''}`}></div>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-12">
          
          {/* PASSO 1: NF Diesel */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right">
                <div className="bg-yellow-50 text-yellow-800 p-3 rounded-xl border border-yellow-200 text-sm shadow-sm">
                    <strong>Comece pela Nota Fiscal!</strong> Use o botão azul abaixo para escanear a NF-e do Combustível usando sua Câmera da foto.
                </div>
                
                <ScanButton label="ESCANEAR NF-E DIESEL" target="dieselNfe" colorClass="bg-blue-600 text-white hover:bg-blue-700 border-blue-700 w-full" />
                
                {(form.cnpjFornecedor || form.notaFiscal) && (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 mt-4 animate-in fade-in">
                        <div className="flex items-center gap-2 text-green-700 font-bold text-sm bg-green-100 p-2 rounded-lg"><Check className="w-4 h-4"/> Leitura Sucesso</div>
                        <Input label="CNPJ" value={form.cnpjFornecedor} readOnly className="bg-gray-200 border-gray-300" />
                        <Input label="Razão Social" value={form.fornecedor} readOnly className="bg-gray-200 border-gray-300"/>
                        <Input label="NF" value={form.notaFiscal} readOnly className="bg-gray-200 border-gray-300"/>
                        
                        <div className="pt-4 border-t border-gray-200">
                            <p className="font-bold text-gray-800 text-center mb-3 text-sm">Essa compra possui Boleto Físico/PDF?</p>
                            <div className="flex gap-2">
                                <button type="button" onClick={nextStep} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold shadow-sm">Sim, tem</button>
                                <button type="button" onClick={() => setCurrentStep(3)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold shadow-sm hover:bg-gray-300">Não, sem boleto</button>
                            </div>
                        </div>
                    </div>
                )}
                
                {(!form.cnpjFornecedor && !form.notaFiscal) && (
                    <div className="mt-4 pt-4 border-t border-dashed">
                        <p className="text-xs text-gray-500 text-center font-bold uppercase mb-2">Não tenho NF aqui ou sem código de barras</p>
                        <button type="button" onClick={() => setCurrentStep(3)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold transition-all shadow-sm">Inserir Manualmente</button>
                    </div>
                )}
            </div>
          )}

          {/* PASSO 2: Boleto Diesel */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right">
                <div className="bg-green-50 text-green-800 p-3 rounded-xl border border-green-200 text-sm shadow-sm">
                    Excelente. Agora aponte a câmera para a linha digitável ou código de barras do <strong>Boleto do Diesel</strong>.
                </div>
                
                <ScanButton label="ESCANEAR BOLETO" target="dieselBoleto" colorClass="bg-green-600 text-white border-green-700 hover:bg-green-700 w-full" />
                
                {form.codigoBoletoDiesel && (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 mt-4 shadow-sm animate-in fade-in">
                        <div className="flex items-center gap-2 text-green-700 font-bold text-sm bg-green-100 p-2 rounded-lg"><Check className="w-4 h-4"/> Boleto Válido</div>
                        <Input label="Vencimento lido" type="date" value={form.vencimentoDiesel} onChange={(e:any) => setForm({...form, vencimentoDiesel: e.target.value})} />
                        <Input label="Valor do Boleto lido" mask="currency" value={form.valorTotal} onChange={(e:any) => setForm({...form, valorTotal: e.target.value})} />
                    </div>
                )}
                
                <div className="flex gap-2 pt-4">
                    <button type="button" onClick={prevStep} className="flex-[0.4] bg-gray-200 rounded-xl font-bold flex items-center justify-center text-gray-700"><ChevronLeft className="w-5 h-5"/></button>
                    <button type="button" onClick={() => {
                        if (!form.codigoBoletoDiesel) {
                            if (window.confirm('Nenhum boleto escaneado. Pular?')) setCurrentStep(3);
                        } else setCurrentStep(3);
                    }} className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-md flex items-center justify-center gap-2">Continuar <ChevronRight className="w-5 h-5"/></button>
                </div>
            </div>
          )}

          {/* PASSO 3: Dados Manuais + Balança */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right">
                
                {form.notaFiscal && form.fornecedor ? (
                    <div className="bg-indigo-50 text-indigo-800 p-3 rounded-xl border border-indigo-200 text-sm font-medium shadow-sm">
                        Quase lá! Precisamos confirmar a <strong>Litragem e Valor</strong> de entrada no estoque.
                    </div>
                ) : (
                    <div className="bg-indigo-50 text-indigo-800 p-3 rounded-xl border border-indigo-200 text-sm font-medium shadow-sm">
                        Ok, vamos registrar os dados de <strong>forma manual</strong>.
                    </div>
                )}
                
                <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                    <Input label="Data da Compra *" type="date" value={form.data} onChange={(e: any) => setForm({ ...form, data: e.target.value })} required />
                    
                    <div className="p-3 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 space-y-3">
                        <Input label="CNPJ (Auto-Busca Razão)" mask="cnpj" placeholder="Ex: 00.000.000/0001-00" value={form.cnpjFornecedor} onChange={(e: any) => setForm({ ...form, cnpjFornecedor: e.target.value })} onBlur={() => handleLookup('fuel')} />
                        <Input label="Razão Social / Fornecedor *" placeholder="Ex: Posto Ipiranga SA" value={form.fornecedor} onChange={(e: any) => setForm({ ...form, fornecedor: e.target.value })} required/>
                        <Input label="NF Diesel *" mask="metric" placeholder="Ex: 54321" value={form.notaFiscal} onChange={(e: any) => setForm({ ...form, notaFiscal: e.target.value })} required />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <Input label="Litros (L) *" mask="decimal" placeholder="Ex: 1000" value={form.litros} onChange={(e: any) => setForm({ ...form, litros: e.target.value })} required />
                        <Input label="Valor Unitário do Litro *" mask="decimal" placeholder="Ex: 5,48" value={form.valorUnitario} onChange={(e: any) => setForm({ ...form, valorUnitario: e.target.value })} required />
                    </div>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-xl border shadow-sm">
                    <p className="font-bold text-gray-800 mb-2 text-sm text-center">O diesel foi pesado na fazenda?</p>
                    <p className="text-xs text-gray-500 text-center mb-3">Tire uma foto do <strong>Ticket da Balança</strong> para registro do peso.</p>
                    <div className="flex gap-2 mb-2">
                        <button type="button" onClick={() => setShowCamera(true)} className="flex-1 flex flex-col items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all">
                            <Camera className="w-6 h-6"/> Foto Ticket
                        </button>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 flex flex-col items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold shadow-md hover:bg-gray-200 active:scale-95 transition-all border">
                            <FileText className="w-6 h-6"/> PDF Ticket
                        </button>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                    {attachments.length > 0 && (
                        <div className="mt-3">
                            <AttachmentList attachments={attachments} onRemove={removeAttachment} uploading={uploading} onAddClick={() => {}} />
                        </div>
                    )}
                </div>

                <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setCurrentStep(form.codigoBoletoDiesel || form.notaFiscal ? 2 : 1)} className="flex-[0.4] bg-gray-200 rounded-xl font-bold flex items-center justify-center text-gray-700"><ChevronLeft className="w-5 h-5"/></button>
                    <button type="button" onClick={() => {
                        if(!form.litros || !form.valorUnitario || !form.notaFiscal) {
                            toast.error("Você precisa informar NF, Litros e Valor Unitário!");
                            return;
                        }
                        if (!form.fornecedor) {
                            toast.error("Informe a Razão Social ou Fornecedor."); return;
                        }
                        nextStep();
                    }} className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-md flex items-center justify-center gap-2">Fretes (Passo 4) <ChevronRight className="w-5 h-5"/></button>
                </div>
            </div>
          )}

          {/* PASSO 4: Fretes */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in slide-in-from-right">
                <div className="bg-orange-50 text-orange-900 p-4 rounded-xl border border-orange-200 text-sm shadow-sm space-y-2">
                    <p><strong>Houve cobrança de frete separada para essa entrega?</strong></p>
                    <p className="text-xs">O sistema irá automaticamente somar o valor de frete com o valor da NF Diesel para compor seu <strong>Custo de Estoque Total</strong> das bombas.</p>
                </div>
                
                {!showFrete ? (
                    <div className="flex flex-col gap-3 mt-8">
                        <button type="button" onClick={() => setShowFrete(true)} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-black shadow-md text-lg active:scale-95 transition-all">
                            Sim, Lançar Frete Extra
                        </button>
                        <button type="button" onClick={nextStep} className="w-full border-2 border-gray-200 text-gray-500 hover:bg-gray-50 py-4 rounded-xl font-bold transition-all">
                            Não, sem frete separado
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        
                        <ScanButton label="ESCANEAR NF / CTE FRETE" target="freteNfe" colorClass="bg-blue-600 text-white border-blue-700" />
                        
                        <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                            <h4 className="font-bold text-gray-700 text-sm uppercase flex items-center gap-1 border-b pb-2"><FileText className="w-4 h-4"/> Dados do Conhecimento de Transporte</h4>
                            
                            <div className="p-3 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 space-y-3">
                                <Input label="CNPJ Transportador" mask="cnpj" placeholder="Ex: 00.000.000/0001-00" value={form.cnpjFornecedorFrete} onChange={(e:any) => setForm({ ...form, cnpjFornecedorFrete: e.target.value })} onBlur={() => handleLookup('frete')} />
                                <Input label="Razão / Trasportador" placeholder="Ex: Transportadora Silva" value={form.fornecedorFrete} onChange={(e:any) => setForm({ ...form, fornecedorFrete: e.target.value })} />
                                <div className="grid grid-cols-2 gap-2">
                                    <Input label="NF / CTE Frete" mask="metric" placeholder="Ex: 9876" value={form.nfFrete} onChange={(e:any) => setForm({ ...form, nfFrete: e.target.value })} />
                                    <Input label="Valor do Frete R$ *" mask="currency" placeholder="Ex: 150,00" value={form.valorFrete} onChange={(e:any) => setForm({...form, valorFrete: e.target.value})} required/>
                                </div>
                            </div>
                        </div>

                        <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm space-y-3">
                             <h4 className="font-bold text-green-800 text-sm flex items-center gap-1"><ScanBarcode className="w-4 h-4"/> Boleto do Frete</h4>
                             <p className="text-xs text-green-700">Se houver boleto para o frete, escaneie para capturar o vencimento.</p>
                             <ScanButton label="ESCANEAR BOLETO FRETE" target="freteBoleto" colorClass="bg-green-600 text-white border-green-700" />
                             
                             {form.codigoBoletoFrete && (
                                <div className="pt-2 animate-in fade-in">
                                    <div className="flex items-center gap-2 text-green-700 font-bold text-sm bg-green-100 p-2 rounded-lg mb-2"><Check className="w-4 h-4"/> Boleto Válido</div>
                                    <Input label="Vencimento Boleto" type="date" value={form.vencimentoFrete} onChange={(e:any) => setForm({ ...form, vencimentoFrete: e.target.value })} />
                                </div>
                             )}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setShowFrete(false)} className="flex-[0.5] py-3 bg-red-100 text-red-700 rounded-xl font-bold shadow-sm border border-red-200">Remover Frete</button>
                            <button type="button" onClick={() => {
                                if(!form.valorFrete) {
                                    toast.error("Informe o valor do frete."); return;
                                }
                                nextStep();
                            }} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-md flex justify-center items-center gap-2">Destinatário <ChevronRight className="w-4 h-4"/></button>
                        </div>
                    </div>
                )}

                {!showFrete && (
                    <div className="pt-4 flex justify-start">
                        <button type="button" onClick={prevStep} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold flex items-center gap-2"><ChevronLeft className="w-4 h-4"/> Revisar NF Diesel</button>
                    </div>
                )}
            </div>
          )}

          {/* PASSO 5: Destinatário */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in slide-in-from-right">
                <div className="bg-purple-50 text-purple-900 justify-center p-4 rounded-xl border border-purple-200 text-sm shadow-sm space-y-2 text-center">
                    <Send className="w-8 h-8 mx-auto text-purple-600 mb-1"/>
                    <p><strong>Para quem vamos enviar todas essas NFs e Boletos?</strong></p>
                    <p className="text-xs text-purple-700">O sistema criará OSs (Ordens de Serviço) no <strong>Meu de Documentos</strong> do usuário escolhido.</p>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mt-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 text-center">Fluxograma</p>
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-full bg-gray-50 border p-3 rounded-lg text-center text-sm font-bold text-gray-600">
                            {userProfile?.full_name || 'Seu Usuário'} <span className="font-normal text-gray-400 text-xs">(Enviando)</span>
                        </div>
                        <ArrowRight className="w-6 h-6 text-gray-300 rotate-90" />
                        <div className="w-full bg-purple-50 border-purple-200 border p-3 rounded-lg">
                            <SearchableSelect 
                                label="Destinatário final para Aprovar/Pagar" 
                                options={[...Array.from(new Set([...(ativos?.colaboradores?.map((c:any) => c.nome) || [])])).filter(name => name !== userProfile?.full_name), userProfile?.full_name || 'Usuário Atual'].filter(Boolean)} 
                                value={form.destinatario} 
                                onChange={(e:any) => setForm({...form, destinatario: e.target.value})} 
                                required 
                                color="purple" 
                            />
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-2 pt-6">
                    <button type="button" onClick={prevStep} className="flex-[0.4] bg-gray-200 rounded-xl font-bold flex items-center justify-center text-gray-700"><ChevronLeft className="w-5 h-5"/></button>
                    <button type="button" onClick={() => {
                        if(!form.destinatario) {
                            toast.error("Para prosseguir, escolha uma pessoa responsável.");
                            return;
                        }
                        nextStep();
                    }} className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-md flex items-center justify-center gap-2">Resumo da Compra <ChevronRight className="w-5 h-5"/></button>
                </div>
            </div>
          )}

          {/* PASSO 6: Resumo e Confirmação */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-in slide-in-from-right">
                <h3 className="font-black text-gray-800 text-center mb-2 text-xl">Confirmação de Registro</h3>
                
                <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                    <div className="flex justify-between items-center text-sm border-b pb-2">
                        <span className="text-gray-500">Fornecimento Diesel NF:</span>
                        <span className="font-bold text-gray-800 text-right">{form.notaFiscal}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b pb-2">
                        <span className="text-gray-500">Fornecedor Geral:</span>
                        <span className="font-bold text-gray-800 text-right max-w-[150px] truncate">{form.fornecedor}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-dashed border-gray-300 pb-2">
                        <span className="text-gray-500">Volume Comprado (Estoque L):</span>
                        <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{form.litros} Litros</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Subtotal NF (S/ Frete):</span>
                        <span className="font-bold text-gray-600">R$ {U.formatValue(form.valorTotal)}</span>
                    </div>
                    
                    {showFrete && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Custo do Frete CTE:</span>
                            <span className="font-bold text-orange-600">+ R$ {U.formatValue(form.valorFrete)}</span>
                        </div>
                    )}
                    
                    {showFrete && (
                        <div className="flex justify-between items-center text-xs text-blue-800 bg-blue-50 border border-blue-200 p-2 rounded-lg mt-2">
                            <span>Preço Final do Litro Diluído:</span>
                            <span className="font-bold">R$ {valorUnitarioFinal().toFixed(2)}/L</span>
                        </div>
                    )}

                    <div className="pt-2">
                         <div className="flex justify-between items-center bg-gray-100 p-2 rounded text-xs mb-3 font-bold text-purple-700">
                             <span>NFs/Boletos enviadas a:</span>
                             <span>{form.destinatario}</span>
                         </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t-4 border-gray-800">
                        <span className="text-sm font-black text-green-900 uppercase flex items-center gap-1">TOTAL GLOBAL:</span>
                        <span className="text-2xl font-black text-green-700 tracking-tighter">R$ {U.formatValue(valorTotalGeral().toFixed(2))}</span>
                    </div>
                </div>

                <div className="flex gap-2 mt-4">
                    <button type="button" onClick={prevStep} className="px-4 py-4 bg-gray-200 text-gray-700 rounded-xl font-bold flex items-center justify-center"><ChevronLeft className="w-5 h-5"/></button>
                    <button type="button" onClick={enviar} className="flex-1 bg-green-600 text-white font-black py-4 rounded-xl hover:bg-green-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 text-lg">
                        <Check className="w-6 h-6" /> CONFIRMAR E SALVAR
                    </button>
                </div>
            </div>
          )}

          {/* Ticker Inferior (Últimas compras - Exibe sempre nos passos seletivos) */}
          {[1,2,3].includes(currentStep) && (
              <div className="mt-8 pt-4">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase flex items-center justify-center gap-1 mb-3">
                  <History className="w-3 h-3 text-green-600"/> Últimas 3 Entradas em Estoque
                </h3>
                {(() => {
                  const recentes = [...(dados?.compras || [])]
                    .filter(c => c.tipo === 'combustivel')
                    .sort((a, b) => {
                      const da = a.data || '';
                      const db = b.data || '';
                      if (db !== da) return db.localeCompare(da);
                      return String(b.id || '').localeCompare(String(a.id || ''));
                    })
                    .slice(0, 3);
    
                  if (recentes.length === 0) return <p className="text-[10px] text-gray-400 italic text-center text-xs">Nenhum abastecimento recente.</p>;
                  
                  return (
                    <div className="space-y-2 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                      {recentes.map((r: any) => (
                        <div key={r.id} className="text-[10px] flex justify-between items-center py-1.5 border-b last:border-0 border-gray-100">
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-gray-600 truncate">{r.fornecedor || 'Fornecedor n/i'}</span>
                            <span className="text-[8px] text-gray-400">{U.formatDate(r.data)} • NF: {r.nota_fiscal}</span>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className="font-bold text-green-700">{U.formatInt(r.litros)} L</span>
                            <span className="text-[8px] font-bold text-gray-400">R$ {U.formatValue(r.valor_total)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
          )}
        </div>
      </div>
      {showScanner && <BarcodeScanner onScanSuccess={handleScanSuccess} onClose={() => setShowScanner(false)} scanMode={scanTarget?.includes('Nfe') ? 'nfe' : 'boleto'} />}
      {showCamera && <CameraCapture onCapture={handlePhotoSuccess} onClose={() => setShowCamera(false)} />}
    </div>
  );
}
