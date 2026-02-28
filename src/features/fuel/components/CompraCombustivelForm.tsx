import React, { useState, useEffect } from 'react';
import { Fuel, X, Plus, Minus, Check, Search, ScanBarcode, CreditCard, History } from 'lucide-react';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { Input } from '../../../components/ui/Shared';
import { U, getOperationalDateLimits } from '../../../utils';
import { toast } from 'react-hot-toast';
import { lookupCNPJ, processBarcode, type NFeData, type BoletoData } from '../../documentos/services/barcodeIntelligence';
import { BarcodeScanner } from '../../documentos/components/BarcodeScanner';

interface CompraCombustivelFormProps {
  onClose: () => void;
}

type ScanTarget = 'dieselNfe' | 'dieselBoleto' | 'freteNfe' | 'freteBoleto';

export function CompraCombustivelForm({ onClose }: CompraCombustivelFormProps) {
  const { dados, dispatch, genericSave, userProfile } = useAppContext();
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
    valorTotal: ''
  });
  
  const [showFrete, setShowFrete] = useState(false);
  const [loadingCNPJ, setLoadingCNPJ] = useState({ fuel: false, frete: false });
  const [showScanner, setShowScanner] = useState(false);
  const [scanTarget, setScanTarget] = useState<ScanTarget | null>(null);

  useEffect(() => {
    const l = U.parseDecimal(form.litros) || 0;
    const v = U.parseDecimal(form.valorUnitario) || 0;
    const f = showFrete ? (U.parseDecimal(form.valorFrete) || 0) : 0;
    
    const total = (l * v) + f;
    setForm(prev => ({ ...prev, valorTotal: total.toFixed(2) }));
  }, [form.litros, form.valorUnitario, form.valorFrete, showFrete]);

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

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.litros || !form.valorUnitario || !form.notaFiscal) {
      toast.error("Preencha Nota Fiscal, Litros e Valor");
      return;
    }
    
    // 1. Salva a Compra
    genericSave('compras', { 
      data: form.data,
      produto: 'Diesel S10',
      litros: U.parseDecimal(form.litros),
      valor_total: U.parseDecimal(form.valorTotal),
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

    // 3. Documentos (Diesel e Frete)
    const docsToCreate = [];
    if (form.notaFiscal) docsToCreate.push({ type: 'NF Diesel', code: form.chaveNfeDiesel || form.notaFiscal, val: form.valorTotal, for: form.fornecedor, venc: form.vencimentoDiesel });
    if (form.codigoBoletoDiesel) docsToCreate.push({ type: 'Boleto Diesel', code: form.codigoBoletoDiesel, val: form.valorTotal, for: form.fornecedor, venc: form.vencimentoDiesel });
    if (showFrete && form.nfFrete) docsToCreate.push({ type: 'NF Frete', code: form.chaveNfeFrete || form.nfFrete, val: form.valorFrete, for: form.fornecedorFrete, venc: form.vencimentoFrete });
    if (showFrete && form.codigoBoletoFrete) docsToCreate.push({ type: 'Boleto Frete', code: form.codigoBoletoFrete, val: form.valorFrete, for: form.fornecedorFrete, venc: form.vencimentoFrete });

    docsToCreate.forEach(d => {
        const docId = U.id('DOC-');
        // A tabela 'documents' usa: titulo, tipo, url, descricao
        genericSave('documents', {
            id: docId,
            titulo: `${d.type}: ${d.code.substring(0, 10)} - ${d.for}`,
            tipo: d.type.includes('NF') ? 'Nota Fiscal' : 'Boleto',
            url: 'Vínculo Automático', // Placeholder para o PDF se houver
            descricao: `Vínculo Automático Compra | Código: ${d.code} | Venc: ${d.venc || 'n/i'}`,
        }, { type: ACTIONS.ADD_RECORD, modulo: 'documentos' });

        genericSave('os', {
            id: U.id('OS-DOC-'),
            modulo: 'Documentos',
            descricao: `DOC: ${d.type} (${d.for})`,
            detalhes: { "Tipo": d.type, "Vencimento": d.venc || '-', "Valor": `R$ ${d.val}` },
            status: 'Pendente',
            data_abertura: form.data,
            created_by: userProfile?.id || null
        }, { type: ACTIONS.ADD_RECORD, modulo: 'os' });
    });
    
    toast.success('Compra e documentos processados!');
    onClose();
  };

  const ScanButton = ({ label, target, colorClass }: { label: string, target: ScanTarget, colorClass: string }) => (
    <button type="button" onClick={() => openScanner(target)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[10px] font-bold transition-all active:scale-95 ${colorClass} shadow-sm border border-black/5`}>
      <ScanBarcode className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm overflow-hidden">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
        <div className="flex justify-between items-center border-b p-4 bg-green-50 rounded-t-2xl shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2 text-green-800"><Fuel className="w-5 h-5" /> Compra de Diesel</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-green-200 text-green-800 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-12">
          <form id="compra-form" onSubmit={enviar} className="space-y-4">
            <Input label="Data da Compra" type="date" value={form.data} onChange={(e: any) => setForm({ ...form, data: e.target.value })} required />

            <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100 space-y-3">
                <div className="flex gap-2">
                    <ScanButton label="SCAN NF DIESEL" target="dieselNfe" colorClass="bg-blue-600 text-white hover:bg-blue-700" />
                    <ScanButton label="SCAN BOLETO" target="dieselBoleto" colorClass="bg-green-600 text-white hover:bg-green-700" />
                </div>
                <Input label="CNPJ Fornecedor" mask="cnpj" value={form.cnpjFornecedor} onChange={(e: any) => setForm({ ...form, cnpjFornecedor: e.target.value })} onBlur={() => handleLookup('fuel')} />
                <Input label="Razão Social" placeholder="Auto ou manual..." value={form.fornecedor} onChange={(e: any) => setForm({ ...form, fornecedor: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                    <Input label="NF Diesel" mask="metric" value={form.notaFiscal} onChange={(e: any) => setForm({ ...form, notaFiscal: e.target.value })} required />
                    <Input label="Vencimento" type="date" value={form.vencimentoDiesel} onChange={(e: any) => setForm({ ...form, vencimentoDiesel: e.target.value })} />
                </div>
            </div>
          
            <div className="grid grid-cols-2 gap-3">
              <Input label="Litros (L)" mask="decimal" value={form.litros} onChange={(e: any) => setForm({ ...form, litros: e.target.value })} required />
              <Input label="Valor Unitário" mask="decimal" value={form.valorUnitario} onChange={(e: any) => setForm({ ...form, valorUnitario: e.target.value })} required />
            </div>

            <div className="border-t pt-2">
                <button type="button" onClick={() => setShowFrete(!showFrete)} className="text-xs font-bold text-green-700 flex items-center gap-1 mb-2">
                    Frete (Opcional) {showFrete ? <Minus className="w-3 h-3"/> : <Plus className="w-3 h-3"/>}
                </button>
                {showFrete && (
                    <div className="bg-gray-50 p-3 rounded-2xl border-2 border-dashed border-gray-200 space-y-3 animate-in slide-in-from-top-1">
                        <div className="flex gap-2">
                            <ScanButton label="NF FRETE" target="freteNfe" colorClass="bg-blue-500 text-white" />
                            <ScanButton label="BOLETO" target="freteBoleto" colorClass="bg-green-500 text-white" />
                        </div>
                        <Input label="CNPJ Transportador" mask="cnpj" value={form.cnpjFornecedorFrete} onChange={(e:any) => setForm({ ...form, cnpjFornecedorFrete: e.target.value })} onBlur={() => handleLookup('frete')} />
                        <Input label="Transportador" value={form.fornecedorFrete} onChange={(e:any) => setForm({ ...form, fornecedorFrete: e.target.value })} />
                        <div className="grid grid-cols-3 gap-2">
                            <Input label="NF" mask="metric" value={form.nfFrete} onChange={(e:any) => setForm({ ...form, nfFrete: e.target.value })} />
                            <Input label="Valor" mask="currency" value={form.valorFrete} onChange={(e:any) => setForm({ ...form, valorFrete: e.target.value })} />
                            <Input label="Venc." type="date" value={form.vencimentoFrete} onChange={(e:any) => setForm({ ...form, vencimentoFrete: e.target.value })} />
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-green-50 p-4 rounded-2xl border border-green-200 flex justify-between items-center shadow-inner">
                <span className="text-sm font-bold text-green-800 uppercase tracking-tight flex items-center gap-1"><CreditCard className="w-4 h-4"/> Total:</span>
                <span className="text-2xl font-black text-green-800 tracking-tighter">R$ {U.formatValue(form.valorTotal)}</span>
            </div>

            <button type="submit" className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                <Check className="w-6 h-6" /> Registrar Compra
            </button>
          </form>
          
          {/* HISTÓRICO RECENTE */}
          <div className="mt-6 border-t pt-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1 mb-3">
              <History className="w-3 h-3 text-green-600"/> Últimas 5 Compras
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
                .slice(0, 5);

              if (recentes.length === 0) return <p className="text-[10px] text-gray-400 italic">Nenhuma compra recente.</p>;
              
              return (
                <div className="space-y-3">
                  {recentes.map((r: any) => (
                    <div key={r.id} className="text-[11px] flex justify-between items-center py-2 border-b last:border-0 border-gray-100 animate-in fade-in duration-300">
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-gray-800 truncate">{r.fornecedor || 'Fornecedor n/i'}</span>
                        <span className="text-[9px] text-gray-500">{U.formatDate(r.data)} • NF: {r.nota_fiscal}</span>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="font-bold text-green-700">{U.formatInt(r.litros)} L</span>
                        <span className="text-[9px] font-bold text-gray-500">R$ {U.formatValue(r.valor_total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
      {showScanner && <BarcodeScanner onScanSuccess={handleScanSuccess} onClose={() => setShowScanner(false)} scanMode={scanTarget?.includes('Nfe') ? 'nfe' : 'boleto'} />}
    </div>
  );
}
