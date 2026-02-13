/**
 * BoletoPreview.tsx — Preview Visual de Boleto Bancário (V3 Final)
 * 
 * Correções solicitadas:
 * - Layout compactado real (sem linhas fantasmas).
 * - Inputs "dentro" dos retângulos (absolute positioning).
 * - Logo maior e reposicionada.
 * - Código de barras visual (barras verticais) via react-barcode.
 * - Margens para exportação correta.
 */
import { forwardRef, useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { BoletoData } from '../services/barcodeIntelligence';
import Barcode from 'react-barcode';

export interface BoletoExtraFields {
  beneficiario: string;
  pagador: string;
  vencimento: string;
  valor: string;
  agenciaCodigo: string;
  nossoNumero: string;
}

interface BoletoPreviewProps {
  data: BoletoData;
  onDataChange?: (updatedData: BoletoData & BoletoExtraFields) => void;
  isExporting?: boolean;
}

export const BoletoPreview = forwardRef<HTMLDivElement, BoletoPreviewProps>(({ data, onDataChange, isExporting = false }, ref) => {
  const [copied, setCopied] = useState(false);

  // Estados locais para edição
  const [beneficiario, setBeneficiario] = useState(''); 
  const [pagador, setPagador] = useState('');
  const [vencimento, setVencimento] = useState(data.vencimento !== 'Não informado' ? data.vencimento : '');
  const [valor, setValor] = useState(data.valor !== '0.00' ? data.valor : '');
  const [agenciaCodigo, setAgenciaCodigo] = useState(data.agenciaCodigo || '');
  const [nossoNumero, setNossoNumero] = useState(data.nossoNumero || '');

  // Notificar mudanças ao pai
  useEffect(() => {
    if (onDataChange) {
      onDataChange({
        ...data,
        beneficiario,
        pagador,
        vencimento,
        valor,
        agenciaCodigo,
        nossoNumero
      });
    }
  }, [beneficiario, pagador, vencimento, valor, agenciaCodigo, nossoNumero, data, onDataChange]);

  const handleCopy = async () => {
    const linhaLimpa = data.linhaDigitavel.replace(/\s/g, '').replace(/\./g, '');
    try {
      await navigator.clipboard.writeText(linhaLimpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('Copie manualmente: ' + linhaLimpa);
    }
  };

  const formatCurrency = (val: string) => {
    const num = parseFloat(val.replace(',', '.'));
    if (isNaN(num)) return val;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Estilos
  const cellLabel = "text-[6px] text-gray-500 uppercase font-bold leading-none mb-0.5 block";
  // Input absoluto para não quebrar layout
  const absoluteInput = "absolute inset-x-1 bottom-0.5 text-[9px] text-gray-900 font-bold bg-transparent border-none p-0 focus:ring-0 placeholder:text-gray-300 outline-none leading-tight h-[14px]";
  const cellContainer = "relative border-b border-gray-300 p-1 h-[34px] overflow-hidden";
  const manualHighlight = "bg-yellow-50";

  return (
    <div
      ref={ref}
      // Adicionado padding-top/bottom para evitar corte na exportação
      className="bg-white p-4 max-w-[800px] mx-auto"
    >
        <div 
            className="border-[1.5px] border-gray-900 rounded-sm overflow-hidden shadow-sm"
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
        {/* ========== CABEÇALHO COMPACTO ========== */}
        <div className="flex items-stretch border-b-2 border-gray-800 bg-white min-h-[36px]">
            <div className="flex items-center justify-center px-2 border-r-2 border-gray-800 min-w-[60px]">
                <img src={`https://logobank.com.br/api/v1/logo/${data.banco}`} 
                     alt={data.bancoNome} 
                     className="max-h-[20px] max-w-[50px] object-contain"
                     onError={(e) => {
                         (e.target as HTMLImageElement).style.display = 'none';
                         // Fallback text will be visible below if image fails, need logic?
                         // For now let's just stick to text if we really wanted reliability but image is nice.
                         // Let's use text primarily as per user request "Logo ou Nome"
                     }}
                />
                <span className="text-xs font-black text-gray-900 leading-none truncate max-w-[80px] ml-1">{data.bancoNome.split(' ')[0]}</span>
            </div>
            <div className="flex items-center justify-center px-2 border-r-2 border-gray-800 min-w-[50px]">
            <span className="text-sm font-black text-gray-900">{data.banco}-X</span>
            </div>
            <div className="flex-1 flex items-center justify-end px-2 bg-gray-50">
            <span className="text-[10px] font-bold text-gray-800 text-right tracking-[0.5px] font-mono">
                {data.linhaDigitavel}
            </span>
            </div>
        </div>

        {/* ========== CORPO (LADO A LADO) ========== */}
        <div className="flex">
            {/* ESQUERDA (75%) */}
            <div className="flex-[3] border-r border-gray-300">
                
                {/* Local de Pagamento */}
                <div className={cellContainer}>
                    <label className={cellLabel}>Local de Pagamento</label>
                    <span className="text-[9px] font-semibold text-gray-900 absolute bottom-1 left-1">Pagável em qualquer banco até o vencimento</span>
                </div>

                {/* Beneficiário (Manual) - Input Absoluto */}
                <div className={`${cellContainer} ${manualHighlight} group`}>
                    <label className={cellLabel}>Beneficiário</label>
                    <input 
                        type="text" 
                        value={beneficiario}
                        onChange={e => setBeneficiario(e.target.value)}
                        placeholder="Nome do Beneficiário..."
                        className={absoluteInput}
                        data-html2canvas-ignore="true" 
                    />
                     <div className="absolute inset-x-1 bottom-0.5 pointer-events-none opacity-0 group-[.printing]:opacity-100">
                        <span className="text-[9px] font-bold text-gray-900">{beneficiario}</span>
                    </div>
                </div>

                {/* Instruções + Logo */}
                <div className="relative border-b border-gray-300 h-[100px] p-2 overflow-hidden flex flex-col justify-between">
                     <label className={cellLabel}>Instruções</label>
                     
                     <div className="relative z-10 text-[9px] text-gray-800 font-medium leading-tight mt-1">
                        <p>SR. CAIXA, NÃO RECEBER APÓS O VENCIMENTO.</p>
                        <p>Referente a: {data.bancoNome}</p>
                     </div>

                    {/* Logo Marca D'água - Posicionada mais abaixo e maior */}
                     <div className="absolute right-2 bottom-2 w-[120px] opacity-10 pointer-events-none">
                        <img src="/logo-full.png" alt="Watermark" className="w-full h-auto grayscale" />
                     </div>
                </div>

            </div>

            {/* DIREITA (25%) */}
            <div className="flex-1 min-w-[100px] bg-gray-50/20">
                {/* Vencimento */}
                <div className={`${cellContainer} bg-red-50`}>
                    <label className={cellLabel}>Vencimento</label>
                    <input type="text" value={vencimento} onChange={e => setVencimento(e.target.value)} className={`${absoluteInput} text-right text-red-700 font-black`} />
                </div>
                {/* Agência/Código */}
                <div className={cellContainer}>
                    <label className={cellLabel}>Agência / Código Beneficiário</label>
                    <input type="text" value={agenciaCodigo} onChange={e => setAgenciaCodigo(e.target.value)} className={`${absoluteInput} text-right`} />
                </div>
                {/* Nosso Número */}
                <div className={cellContainer}>
                     <label className={cellLabel}>Nosso Número</label>
                     <input type="text" value={nossoNumero} onChange={e => setNossoNumero(e.target.value)} className={`${absoluteInput} text-right`} />
                </div>
                {/* Valor Documento */}
                <div className={`${cellContainer} bg-indigo-50`}>
                    <label className={cellLabel}>(=) Valor Documento</label>
                    <div className="absolute inset-x-1 bottom-0.5 flex justify-end items-center gap-1">
                        <span className="text-[8px]">R$</span>
                        <input type="text" value={valor} onChange={e => setValor(e.target.value)} className="text-[10px] bg-transparent border-none p-0 text-right font-black w-20 outline-none" />
                    </div>
                </div>
                 {/* Espaço em branco (Desconto) */}
                 <div className={cellContainer}>
                    <label className={cellLabel}>(-) Desconto / Abatimento</label>
                </div>
                {/* Valor Cobrado */}
                <div className={`${cellContainer} bg-gray-100 flex flex-col justify-end`}>
                    <label className={cellLabel}>(=) Valor Cobrado</label>
                    <span className="text-right text-[10px] font-black">{formatCurrency(valor)}</span>
                </div>
            </div>
        </div>

        {/* Pagador */}
        <div className={`border-b border-gray-900 p-1 min-h-[40px] ${manualHighlight} relative group`}>
            <label className={cellLabel}>Pagador</label>
            <input 
                type="text" 
                value={pagador}
                onChange={e => setPagador(e.target.value)}
                placeholder="Nome, CPF/CNPJ, Endereço..."
                className="w-full text-[9px] font-bold bg-transparent border-none p-0 mt-0.5 focus:ring-0 outline-none"
                data-html2canvas-ignore="true"
            />
             <div className="absolute inset-x-1 top-4 pointer-events-none opacity-0 group-[.printing]:opacity-100">
                <span className="text-[9px] font-bold text-gray-900">{pagador}</span>
            </div>
        </div>

        {/* Footer Autenticação */}
        <div className="py-0.5 px-3 border-b border-dashed border-gray-400 text-right">
             <span className="text-[5px] text-gray-400">Ficha de Compensação</span>
        </div>

        {/* Código de Barras (Visual Real) */}
        <div className="p-3 bg-white flex flex-col items-center justify-center gap-2">
            <div data-html2canvas-ignore="true" className="w-full">
                <button onClick={handleCopy} className="w-full flex items-center justify-center gap-1 py-1.5 bg-gray-100 rounded text-[9px] font-bold text-gray-600 hover:bg-gray-200">
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copiado" : "Copiar Linha Digitável"}
                </button>
            </div>
            
            <div className="w-full flex justify-center overflow-hidden py-2">
                 <Barcode 
                    value={data.codigoBarras} 
                    format="ITF" 
                    width={1.2} 
                    height={40} 
                    displayValue={false} 
                    margin={0}
                />
            </div>
        </div>
      </div>
    </div>
  );
});

BoletoPreview.displayName = 'BoletoPreview';
