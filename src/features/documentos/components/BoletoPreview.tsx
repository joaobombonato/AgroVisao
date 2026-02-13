/**
 * BoletoPreview.tsx — Preview Visual de Boleto Bancário (V4 Finalíssimo)
 * 
 * Ajustes V4:
 * - Linha Digitável: Quebrada em 2 linhas para não estourar no mobile.
 * - Local de Pagamento: Layout corrigido para não sobrepor texto.
 * - Beneficiário: Placeholder atualizado (+CPF/CNPJ).
 * - Logo Watermark: Posicionada no 'vazio' das instruções, à direita.
 * - Pagador: Auto-preenchimento com nome da Fazenda/Proprietário.
 * - Barcode: Ajustado para leitura (ITF, altura maior).
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
  const { fazendaSelecionada } = useAppContext(); // Contexto para Auto-Fill
  const [copied, setCopied] = useState(false);

  // Estados locais para edição
  const [beneficiario, setBeneficiario] = useState(''); 
  const [pagador, setPagador] = useState('');
  const [vencimento, setVencimento] = useState(data.vencimento !== 'Não informado' ? data.vencimento : '');
  const [valor, setValor] = useState(data.valor !== '0.00' ? data.valor : '');
  const [agenciaCodigo, setAgenciaCodigo] = useState(data.agenciaCodigo || '');
  const [nossoNumero, setNossoNumero] = useState(data.nossoNumero || '');

  // Auto-Fill Pagador (apenas na montagem inicial se estiver vazio)
  useEffect(() => {
    if (!pagador && fazendaSelecionada) {
       const nome = fazendaSelecionada.proprietario || fazendaSelecionada.nome || '';
       if (nome) setPagador(nome);
    }
  }, [fazendaSelecionada]); // Executa quando carregar o contexto

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

  // Formata Linha Digitável em 2 linhas (quebra no meio aprox)
  const formatLinhaDigitavel = (linha: string) => {
      // Ex: 75691.32140 01315.620607 07615.830010 3 13610000016300
      // Tentar quebrar após o 2º ou 3º grupo para ficar equilibrado visualmente
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

  // Estilos
  const cellLabel = "text-[6px] text-gray-500 uppercase font-bold leading-none mb-0.5 block";
  const absoluteInput = "absolute inset-x-1 bottom-0.5 text-[9px] text-gray-900 font-bold bg-transparent border-none p-0 focus:ring-0 placeholder:text-gray-300 outline-none leading-tight h-[14px]";
  const cellContainer = "relative border-b border-gray-300 p-1 h-[36px] overflow-hidden"; // Aumentado um pouco para 36px
  const manualHighlight = "bg-yellow-50";

  return (
    <div
      ref={ref}
      className="bg-white p-4 max-w-[800px] mx-auto"
    >
        <div 
            className="border-[1.5px] border-gray-900 rounded-sm overflow-hidden shadow-sm"
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
        {/* ========== CABEÇALHO (2 LINHAS DIGITÁVEL) ========== */}
        <div className="flex items-stretch border-b-2 border-gray-800 bg-white min-h-[44px]">
            <div className="flex items-center justify-center px-2 border-r-2 border-gray-800 min-w-[60px]">
                <img src={`https://logobank.com.br/api/v1/logo/${data.banco}`} 
                     alt={data.bancoNome} 
                     className="max-h-[24px] max-w-[50px] object-contain"
                     onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
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
            {/* ESQUERDA (75%) */}
            <div className="flex-[3] border-r border-gray-300">
                
                {/* Local de Pagamento (Altura Fixa maior) */}
                <div className="relative border-b border-gray-300 p-1 h-[40px] overflow-hidden">
                    <label className={cellLabel}>Local de Pagamento</label>
                    <span className="text-[9px] font-semibold text-gray-900 absolute bottom-1 left-1 leading-tight w-full pr-1">
                        Pagável em qualquer banco até o vencimento
                    </span>
                </div>

                {/* Beneficiário (Manual) */}
                <div className={`${cellContainer} ${manualHighlight} group`}>
                    <label className={cellLabel}>Beneficiário</label>
                    <input 
                        type="text" 
                        value={beneficiario}
                        onChange={e => setBeneficiario(e.target.value)}
                        placeholder="Nome do Beneficiário, CPF/CNPJ..."
                        className={absoluteInput}
                        data-html2canvas-ignore="true" 
                    />
                     <div className="absolute inset-x-1 bottom-0.5 pointer-events-none opacity-0 group-[.printing]:opacity-100">
                        <span className="text-[9px] font-bold text-gray-900">{beneficiario}</span>
                    </div>
                </div>

                {/* Instruções + Logo */}
                {/* Altura ajustada para alinhar com colunas da direita (5 linhas * 36px = ~180px total height direita?) 
                   Direita: Venc(36) + Agencia(36) + NossoNum(36) + ValDoc(36) + Desc(36) + ValCob(36) = 6 * 36 = 216px?
                   Esquerda: Local(40) + Benef(36) = 76px. Restam ~140px para instrucoes.
                */}
                <div className="relative border-b border-gray-300 h-[144px] p-2 overflow-hidden flex flex-col">
                     <label className={cellLabel}>Instruções (Texto de Responsabilidade do Beneficiário)</label>
                     
                     <div className="relative z-10 text-[9px] text-gray-800 font-medium leading-tight mt-1 space-y-1">
                        <p>SR. CAIXA, NÃO RECEBER APÓS O VENCIMENTO.</p>
                        <p>Boleto processado eletronicamente.</p>
                        <p>Referente a: {data.bancoNome}</p>
                     </div>

                    {/* Logo Marca D'água - Canto Inferior Direito da caixa de Instruções */}
                     <div className="absolute right-0 bottom-0 p-2 opacity-20 pointer-events-none w-[120px]">
                        <img src="/logo-full.png" alt="Watermark" className="w-full object-contain grayscale" />
                     </div>
                </div>

            </div>

            {/* DIREITA (25%) */}
            <div className="flex-1 min-w-[110px] bg-gray-50/20">
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
                        <input type="text" value={valor} onChange={e => setValor(e.target.value)} className="text-[10px] bg-transparent border-none p-0 text-right font-black w-24 outline-none" />
                    </div>
                </div>
                 {/* Desconto */}
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
        <div className={`border-b border-gray-900 p-1 min-h-[44px] ${manualHighlight} relative group`}>
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
            
            <div className="w-full flex justify-center overflow-hidden py-2 px-4">
                 <Barcode 
                    value={data.codigoBarras} // Use numeric code, NOT formatted line
                    format="ITF" 
                    width={1.6} // Largura de barra ajustada para leitura
                    height={50} 
                    displayValue={false} 
                    margin={0}
                    background="transparent"
                />
            </div>
        </div>
      </div>
    </div>
  );
});

BoletoPreview.displayName = 'BoletoPreview';
