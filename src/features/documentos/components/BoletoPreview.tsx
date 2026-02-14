/**
 * BoletoPreview.tsx — Preview Visual de Boleto Bancário (V6 Final)
 * 
 * Ajustes V6:
 * - Correção de erro de sintaxe (função dentro do JSX).
 * - Logo: Tgentil (SVG) -> Guibranco (PNG) -> Bankline (Fallback).
 * - Layout: Mantém ajustes do usuário (instruções, textos, padding).
 * - R$: Junto ao valor.
 */
import { forwardRef, useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { BoletoData } from '../services/barcodeIntelligence';
import Barcode from 'react-barcode';
import { useAppContext } from '../../../context/AppContext';

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
  const { fazendaSelecionada } = useAppContext();
  const [copied, setCopied] = useState(false);

  // Estados locais
  const [beneficiario, setBeneficiario] = useState(''); 
  const [pagador, setPagador] = useState('');
  const [vencimento, setVencimento] = useState(data.vencimento !== 'Não informado' ? data.vencimento : '');
  const [valor, setValor] = useState(data.valor !== '0.00' ? data.valor : '');
  const [agenciaCodigo, setAgenciaCodigo] = useState(data.agenciaCodigo || '');
  const [nossoNumero, setNossoNumero] = useState(data.nossoNumero || '');

  // Auto-Fill Pagador
  useEffect(() => {
    if (!pagador && fazendaSelecionada) {
       const nome = fazendaSelecionada.proprietario || fazendaSelecionada.nome || '';
       if (nome) setPagador(nome);
    }
  }, [fazendaSelecionada]);

  // Sync changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange({ ...data, beneficiario, pagador, vencimento, valor, agenciaCodigo, nossoNumero });
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
  
  // Formata Linha Digitável em 2 linhas
  const formatLinhaDigitavel = (linha: string) => {
      const parts = linha.split(' ');
      if (parts.length >= 3) {
          const part1 = parts.slice(0, 2).join(' ');
          const part2 = parts.slice(2).join(' ');
          return (
              <div className="flex flex-col items-end leading-tight">
                  <span>{part1}</span>
                  <span>{part2}</span>
              </div>
          );
      }
      return linha;
  };

  // Provider de Logo de Banco
  const getBankLogoUrl = (code: string) => {
      const cleanCode = code.replace(/[^0-9]/g, '').padStart(3, '0');
      // Tentativa 1: SVG do Tgentil (Geralmente muito bom)
      return `https://raw.githubusercontent.com/Tgentil/Bancos-em-SVG/master/bancos/${cleanCode}.svg`;
  };

  // Estilos
  const cellLabel = "text-[6px] text-gray-500 uppercase font-bold leading-none mb-0.5 block";
  const absoluteInput = "absolute inset-x-1 bottom-0.5 text-[9px] text-gray-900 font-bold bg-transparent border-none p-0 focus:ring-0 placeholder:text-gray-300 outline-none leading-tight h-[14px]";
  const cellContainer = "relative border-b border-gray-300 p-1 h-[36px] overflow-hidden"; // 36px padrão
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
        
        {/* ========== CABEÇALHO ========== */}
        <div className="flex items-stretch border-b-2 border-gray-800 bg-white min-h-[44px]">
            <div className="flex items-center justify-center px-2 border-r-2 border-gray-800 min-w-[60px]">
                <img 
                     src={getBankLogoUrl(data.banco)} 
                     alt={data.bancoNome} 
                     className="max-h-[24px] max-w-[50px] object-contain"
                     onError={(e) => {
                        // Fallback 1: Guibranco PNG
                        const target = e.target as HTMLImageElement;
                        const cleanCode = data.banco.replace(/[^0-9]/g, '').padStart(3, '0');
                        if (target.src.includes('Tgentil')) {
                            target.src = `https://raw.githubusercontent.com/guibranco/BancosBrasileiros/main/logos/${cleanCode}.png`;
                        } else {
                            target.style.display = 'none';
                        }
                     }}
                />
                <span className="text-xs font-black text-gray-900 leading-none truncate max-w-[80px] ml-1">{data.bancoNome.split(' ')[0]}</span>
            </div>
            <div className="flex items-center justify-center px-2 border-r-2 border-gray-800 min-w-[50px]">
                <span className="text-sm font-black text-gray-900">{data.banco}-X</span>
            </div>
            <div className="flex-1 flex items-center justify-end px-2 bg-gray-50 py-1">
                <span className="text-[10px] font-black text-gray-800 text-right tracking-[0.5px] font-mono">
                    {formatLinhaDigitavel(data.linhaDigitavel)}
                </span>
            </div>
        </div>

        {/* ========== CORPO ========== */}
        <div className="flex">
            {/* ESQUERDA */}
            <div className="flex-[3] border-r border-gray-300">
                
                {/* Local de Pagamento */}
                <div className="relative border-b border-gray-300 p-1 h-[40px] overflow-hidden">
                    <label className={cellLabel}>Local de Pagamento</label>
                    <span className="text-[9px] font-semibold text-gray-900 absolute bottom-1 left-1 leading-tight w-full pr-1">
                        Pagável em qualquer banco ou correspondente até o vencimento
                    </span>
                </div>

                {/* Beneficiário */}
                <div className={`${cellContainer} ${manualHighlight} group`}>
                    <label className={cellLabel}>Beneficiário</label>
                    <input 
                        type="text" 
                        value={beneficiario}
                        onChange={e => setBeneficiario(e.target.value)}
                        placeholder="Nome do Beneficiário | CPF/CNPJ"
                        className={absoluteInput}
                        data-html2canvas-ignore="true" 
                    />
                     <div className="absolute inset-x-1 bottom-0.5 pointer-events-none opacity-0 group-[.printing]:opacity-100">
                        <span className="text-[10px] font-bold text-gray-900">{beneficiario}</span>
                    </div>
                </div>

                {/* Instruções */}
                <div className="relative border-b border-gray-300 h-[144px] p-2 overflow-hidden flex flex-col">
                     <label className={cellLabel}>Instruções</label>
                     
                     <div className="relative z-10 text-[10px] text-gray-800 font-medium leading-relaxed mt-1 space-y-1">
                        <p>Boleto processado eletronicamente pelo VisãoAgro. (favor confirmar as informações antes de efetuar o pagamento)</p>
                        <p>SR. CAIXA, NÃO RECEBER APÓS O VENCIMENTO.</p>
                        <p>Referente a: {data.bancoNome} - Título: {data.nossoNumero || 'N/A'}</p>
                     </div>

                    {/* Marca D'água - Canto Inferior Direito (Ajuste do Usuário: Opacity 40, w-160) */}
                     <div className="absolute right-0 bottom-0 p-2 opacity-40 pointer-events-none w-[160px]">
                        <img src="/logo-full.png" alt="Watermark" className="w-full object-contain grayscale" />
                     </div>
                </div>

            </div>

            {/* DIREITA */}
            <div className="flex-1 min-w-[110px] bg-gray-50/20">
                {/* Vencimento */}
                <div className={`${cellContainer} ${manualHighlight} bg-red-50/30`}>
                    <label className={cellLabel}>Vencimento</label>
                    <input type="text" value={vencimento} onChange={e => setVencimento(e.target.value)} className={`${absoluteInput} text-right text-red-700 font-black`} />
                </div>
                {/* Agência */}
                <div className={cellContainer}>
                    <label className={cellLabel}>Agência / Código Beneficiário</label>
                    <input type="text" value={agenciaCodigo} onChange={e => setAgenciaCodigo(e.target.value)} className={`${absoluteInput} text-right`} />
                </div>
                {/* Nosso Número */}
                <div className={cellContainer}>
                    <label className={cellLabel}>Nosso Número</label>
                     <div className="absolute inset-x-1 bottom-1 text-right text-[10px] font-bold text-gray-800">{nossoNumero}</div>
                </div>
                {/* Valor Documento */}
                <div className={`${cellContainer} ${manualHighlight} bg-indigo-50/30`}>
                    <label className={cellLabel}>(=) Valor Documento</label>
                    <div className="absolute inset-x-1 bottom-0.5 flex justify-end items-baseline font-black text-gray-900">
                         <span className="text-[10px]">R$</span>
                         <input 
                            type="text" 
                            value={valor} 
                            onChange={e => setValor(e.target.value)} 
                            className="text-[11px] bg-transparent border-none p-0 text-right font-black w-24 outline-none" 
                        />
                    </div>
                </div>
                 {/* Descontos */}
                 <div className={cellContainer}>
                    <label className={cellLabel}>(-) Desconto / Abatimento</label>
                </div>
                {/* Valor Cobrado */}
                <div className={`${cellContainer} bg-gray-100 flex flex-col justify-end`}>
                    <label className={cellLabel}>(=) Valor Cobrado</label>
                    <div className="text-right text-[11px] font-black mr-1 mb-0.5">R$ {valor}</div>
                </div>
            </div>
        </div>

        {/* Pagador */}
        <div className="border-b border-gray-900 p-1.5 min-h-[48px] bg-gray-50/50">
            <label className={cellLabel}>Pagador</label>
            <div className="text-[10px] font-bold text-gray-900 mt-0.5 uppercase">
                {pagador || "Preenchimento Automático..."}
            </div>
        </div>

        {/* Footer */}
         <div className="py-0.5 px-3 border-b border-dashed border-gray-400 text-right bg-white">
             <span className="text-[5px] text-gray-400 uppercase">Ficha de Compensação</span>
        </div>

        {/* Código de Barras */}
        <div className="p-4 bg-white flex flex-col items-start gap-1">
            <p className="text-[8px] font-bold text-gray-900 ml-1">
                Use o código de barras abaixo para pagamentos:
            </p>
            
            {/* Numeração */}
             <p className="text-[9px] font-bold text-gray-700 tracking-widest font-mono ml-1 mb-1 select-all">
                {data.codigoBarras}
            </p>

            {/* Barcode */}
            <div className="w-full flex justify-start overflow-hidden pl-1">
                 <Barcode 
                    value={data.codigoBarras} 
                    format="ITF" 
                    width={1.6} 
                    height={55} 
                    displayValue={false} 
                    margin={0}
                    background="transparent"
                    lineColor="#000"
                />
            </div>
            
             {/* Botão Copiar */}
            <div data-html2canvas-ignore="true" className="w-full mt-2">
                <button onClick={handleCopy} className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Linha Digitável Copiada!" : "Copiar Linha Digitável"}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
});

BoletoPreview.displayName = 'BoletoPreview';
