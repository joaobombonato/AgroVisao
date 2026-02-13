import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { processBarcode, type ParsedBarcode, type NFeData, type BoletoData } from '../services/barcodeIntelligence';

// Tipos auxiliares para os dados extras
import { type DanfeExtraFields } from '../components/DanfePreview';
import { type BoletoExtraFields } from '../components/BoletoPreview';

export function useBarcodeScanning(setForm: React.Dispatch<React.SetStateAction<any>>) {
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState<'nfe' | 'boleto'>('nfe');
  const [showScanSelector, setShowScanSelector] = useState(false);
  const [processingBarcode, setProcessingBarcode] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<ParsedBarcode | null>(null);

  const handleScanSuccess = useCallback(async (code: string) => {
      setShowScanner(false);
      setProcessingBarcode(true);
      
      try {
        const result = await processBarcode(code);
        setDocumentPreview(result);
        
        if (result.type === 'nfe') {
          const nfe = result as NFeData;
          const nomeEmitente = nfe.fantasia || nfe.emitente || 'Emitente';
          setForm((prev: any) => ({
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
          setForm((prev: any) => ({
            ...prev,
            tipo: 'Boleto',
            nome: `Boleto ${boleto.bancoNome} - ${boleto.valorFormatado}`,
            codigo: boleto.codigoBarras,
            valor: boleto.valor !== '0.00' ? boleto.valor : '',
            obs: `${boleto.bancoNome} | Venc: ${boleto.vencimento} | Linha: ${boleto.linhaDigitavel}`,
            destinatario: 'Financeiro'
          }));
          toast.success(`💳 Boleto detectado! ${boleto.valorFormatado} - Venc: ${boleto.vencimento}`, { duration: 4000 });
        } else {
          setForm((prev: any) => ({ ...prev, codigo: code }));
          toast.success('Código lido com sucesso!', { icon: '📷' });
        }
      } catch (err) {
        console.error('[Scan] Erro ao processar:', err);
        setForm((prev: any) => ({ ...prev, codigo: code }));
        toast.success('Código lido (processamento parcial).', { icon: '⚠️' });
      } finally {
        setProcessingBarcode(false);
      }
  }, [setForm]);

  const handleDanfeDataChange = useCallback((updatedData: NFeData & DanfeExtraFields) => {
    const nomeEmitente = updatedData.fantasia || updatedData.emitente || 'Emitente';
    const vencimentosStr = updatedData.vencimentos?.length > 0 
      ? updatedData.vencimentos.map(v => new Date(v + 'T12:00:00').toLocaleDateString('pt-BR')).join(', ')
      : '';
    const produtosStr = updatedData.produtos?.length > 0
      ? updatedData.produtos.join(', ')
      : '';
    
    setForm((prev: any) => ({
      ...prev,
      tipo: 'Nota Fiscal',
      nome: `NF ${updatedData.numero} - ${nomeEmitente}`,
      codigo: updatedData.chave,
      valor: updatedData.valorTotal || prev.valor,
      obs: [
        `CNPJ: ${updatedData.cnpjFormatado}`,
        updatedData.municipio ? `Local: ${updatedData.municipio}` : '',
        updatedData.diaEmissao ? `Emissão: ${updatedData.diaEmissao}/${updatedData.anoMes}` : `Competência: ${updatedData.anoMes}`,
        vencimentosStr ? `Venc: ${vencimentosStr}` : '',
        produtosStr ? `Produtos: ${produtosStr}` : '',
      ].filter(Boolean).join(' | '),
      destinatario: 'Financeiro'
    }));
  }, [setForm]);

  const handleBoletoDataChange = useCallback((updatedData: BoletoData & BoletoExtraFields) => {
      setForm((prev: any) => ({
          ...prev,
          valor: updatedData.valor && updatedData.valor !== '0.00' ? updatedData.valor : prev.valor,
          obs: [
              updatedData.beneficiario ? `Beneficiário: ${updatedData.beneficiario}` : '',
              updatedData.pagador ? `Pagador: ${updatedData.pagador}` : '',
              updatedData.agenciaCodigo ? `Ag/Cód: ${updatedData.agenciaCodigo}` : '',
              updatedData.nossoNumero ? `Nosso Nº: ${updatedData.nossoNumero}` : '',
              `Venc: ${updatedData.vencimento}`,
              `Linha: ${updatedData.linhaDigitavel}`
          ].filter(Boolean).join(' | '),
      }));
  }, [setForm]);

  return {
    showScanner, setShowScanner,
    scanMode, setScanMode,
    showScanSelector, setShowScanSelector,
    processingBarcode,
    documentPreview, setDocumentPreview,
    handleScanSuccess,
    handleDanfeDataChange,
    handleBoletoDataChange
  };
}
