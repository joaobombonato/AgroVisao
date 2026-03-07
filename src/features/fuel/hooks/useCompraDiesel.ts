/**
 * useCompraDiesel — Hook de lógica de negócio da tela de Compra de Diesel.
 * Extraído de CompraCombustivelForm.tsx para facilitar manutenção por IA.
 * 
 * Responsabilidades:
 * - Estado do wizard (formulário, steps, scanner, câmera)
 * - Cálculos de rateio do frete
 * - Handlers de CNPJ, scan, foto e envio
 * - Integração com attachments
 */
import { useState, useEffect } from 'react';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { U } from '../../../utils';
import { toast } from 'react-hot-toast';
import { lookupCNPJ, processBarcode, type NFeData, type BoletoData } from '../../documentos/services/barcodeIntelligence';
import { useAttachments } from '../../documentos/hooks/useAttachments';

export type ScanTarget = 'dieselNfe' | 'dieselBoleto' | 'freteNfe' | 'freteBoleto';

export default function useCompraDiesel(onClose: () => void) {
  const { dados, dispatch, genericSave, userProfile, ativos } = useAppContext();

  // ==========================================
  // ESTADO
  // ==========================================
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

  const attachmentHook = useAttachments();

  // ==========================================
  // CÁLCULOS
  // ==========================================
  useEffect(() => {
    const l = U.parseDecimal(form.litros) || 0;
    const v = U.parseDecimal(form.valorUnitario) || 0;
    const total = l * v;
    setForm(prev => ({ ...prev, valorTotal: total.toFixed(2) }));
  }, [form.litros, form.valorUnitario]);

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

  // ==========================================
  // NAVIGATION
  // ==========================================
  const nextStep = () => setCurrentStep(p => p + 1);
  const prevStep = () => setCurrentStep(p => p - 1);

  // ==========================================
  // HANDLERS
  // ==========================================
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
    await attachmentHook.addCameraAttachment(file);
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
      valor_total: valorTotalGeral(),
      valor_unitario: valorUnitarioFinal(),
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
    
    // 2. Cria OS Compra
    const descOS = `Compra Diesel: ${form.litros}L (NF: ${form.notaFiscal})`;
    genericSave('os', {
        modulo: 'Compra Diesel',
        descricao: descOS,
        detalhes: { "Fornecedor": form.fornecedor || '-', "Litros": `${form.litros} L`, "Venc.": form.vencimentoDiesel || 'n/i' },
        status: 'Pendente',
        data_abertura: form.data,
        created_by: userProfile?.id || null
    }, { type: ACTIONS.ADD_RECORD, modulo: 'os' });

    // 3. Tramita Documentos
    const fileUrls = attachmentHook.attachments.map(a => a.url).join(',');
    const fileNames = attachmentHook.attachments.map(a => a.name).join(', ');

    const docsToCreate: any[] = [];
    if (form.notaFiscal) docsToCreate.push({ type: 'NF Diesel', code: form.chaveNfeDiesel || form.notaFiscal, val: U.parseDecimal(form.valorTotal), for: form.fornecedor, venc: form.vencimentoDiesel, isAtt: false });
    if (form.codigoBoletoDiesel) docsToCreate.push({ type: 'Boleto Diesel', code: form.codigoBoletoDiesel, val: U.parseDecimal(form.valorTotal), for: form.fornecedor, venc: form.vencimentoDiesel, isAtt: false });
    if (showFrete && form.nfFrete) docsToCreate.push({ type: 'NF Frete', code: form.chaveNfeFrete || form.nfFrete, val: U.parseDecimal(form.valorFrete), for: form.fornecedorFrete, venc: form.vencimentoFrete, isAtt: false });
    if (showFrete && form.codigoBoletoFrete) docsToCreate.push({ type: 'Boleto Frete', code: form.codigoBoletoFrete, val: U.parseDecimal(form.valorFrete), for: form.fornecedorFrete, venc: form.vencimentoFrete, isAtt: false });
    if (attachmentHook.attachments.length > 0) docsToCreate.push({ type: 'Ticket Balança', code: form.notaFiscal, val: 0, for: form.fornecedor, venc: '', isAtt: true });

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

  return {
    // State
    currentStep, setCurrentStep,
    form, setForm,
    showFrete, setShowFrete,
    loadingCNPJ,
    showScanner, setShowScanner,
    scanTarget,
    showCamera, setShowCamera,
    // Attachments
    attachments: attachmentHook.attachments,
    handleFileSelect: attachmentHook.handleFileSelect,
    removeAttachment: attachmentHook.removeAttachment,
    uploading: attachmentHook.uploading,
    fileInputRef: attachmentHook.fileInputRef,
    // Context data
    dados,
    userProfile,
    ativos,
    // Calculations
    valorUnitarioFinal,
    valorTotalGeral,
    // Handlers
    nextStep,
    prevStep,
    handleLookup,
    openScanner,
    handleScanSuccess,
    handlePhotoSuccess,
    enviar
  };
}
