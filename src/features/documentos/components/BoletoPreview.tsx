/**
 * BoletoPreview.tsx — Preview Visual de Boleto Bancário (V5 Final)
 * 
 * Ajustes V5:
 * - Campos Editáveis: Apenas Beneficiário, Vencimento e Valor (com destaque).
 * - Layout: "Local de Pagamento" expandido, "R$" junto ao valor.
 * - Barcode: Texto explicativo + Numeração 44 dígitos + Barras (ITF) + Altura maior.
 * - Logo: Provider alternativo (GitHub) para maior confiabilidade.
 * - Marca D'água: Ajuste de posicionamento.
 * - Pagador: Read-only (com autofill).
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

  const formatCurrencyInput = (val: string) => {
    // Mantém o valor como string digitada pelo usuário, mas formata para display se não estiver focando?
    // Simplificação: vamos confiar no input text por enquanto, mas garantir visual R$
    return val; 
  };
  
  // Função para formatar linha digitável visualmente
  const formatLinhaHeader = (linha: string) => {
      // Divide em 2 partes equilibradas
      const parts = linha.split(' ');
      if (parts.length > 2) {
          const mid = Math.ceil(parts.length / 2);
          return (
              <div className="flex flex-col items-end leading-none text-[10px] font-mono font-bold tracking-tight">
                  <span>{parts.slice(0, mid).join(' ')}</span>
                  <span>{parts.slice(mid).join(' ')}</span>
              </div>
          );
      }
      return linha;
  };

  // Provider de Logo de Banco (Bancos Brasileiros - GitHub raw)
  // Fallback para api google ou local
  const getBankLogoUrl = (code: string) => {
      // O código costuma ser 3 dígitos. Ex: 001, 237, 756.
      const cleanCode = code.replace(/[^0-9]/g, '').padStart(3, '0');
      // Repositório confiável de ícones
      return `https://raw.githubusercontent.com/guibranco/BancosBrasileiros/main/logos/${cleanCode}.png`;
  };

  // Styles
  const cellLabel = "text-[6px] text-gray-500 uppercase font-bold leading-none mb-0.5 block";
  const absoluteInput = "absolute inset-x-1 bottom-0.5 text-[10px] text-gray-900 font-bold bg-transparent border-none p-0 focus:ring-0 placeholder:text-gray-300 outline-none leading-tight";
  const cellContainer = "relative border-b border-gray-300 p-1 h-[40px] overflow-hidden"; // Altura padrão razoável
  const highlightEdit = "bg-yellow-50 hover:bg-yellow-100 transition-colors cursor-text";
  
  return (
    <div ref={ref} className="bg-white p-4 max-w-[800px] mx-auto">
        <div className="border-[1.5px] border-gray-900 rounded-sm overflow-hidden shadow-sm font-sans">
            
            {/* CABEÇALHO */}
            <div className="flex items-stretch border-b-2 border-gray-800 bg-white h-[48px]">
                <div className="flex items-center justify-center px-3 border-r-2 border-gray-800 min-w-[65px]">
                    <img 
                        src={getBankLogoUrl(data.banco)} 
                        alt="Banco" 
                        className="max-h-[30px] max-w-[60px] object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                     {/* Nome Fallback se imagem falhar (controlado via CSS/JS se preferir, ou display:none no error) */}
                </div>
                <div className="flex items-center justify-center px-3 border-r-2 border-gray-800 min-w-[60px]">
                    <span className="text-lg font-black text-gray-900">{data.banco}-X</span>
                </div>
                <div className="flex-1 flex items-center justify-end px-3 bg-gray-50/50">
                    {formatLinhaHeader(data.linhaDigitavel)}
                </div>
            </div>

            {/* CORPO */}
            <div className="flex">
                {/* COLUNA ESQUERDA */}
                <div className="flex-[3] border-r border-gray-300">
                    
                    {/* Local de Pagamento (Expandido) */}
                    <div className="relative border-b border-gray-300 p-1 h-[42px]">
                        <label className={cellLabel}>Local de Pagamento</label>
                        <span className="text-[9px] font-semibold text-gray-900 absolute bottom-1 left-1 leading-tight w-full pr-1">
                            Pagável em qualquer banco ou correspondente até o vencimento
                        </span>
                    </div>

                    {/* Beneficiário - EDITÁVEL */}
                    <div className={`${cellContainer} ${highlightEdit} group`}>
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
                    <div className="relative border-b border-gray-300 h-[150px] p-2 flex flex-col">
                         <label className={cellLabel}>Instruções (Texto de Responsabilidade do Beneficiário)</label>
                         
                         <div className="relative z-10 text-[10px] text-gray-800 font-medium leading-relaxed mt-1 space-y-1">
                            <p>SR. CAIXA, NÃO RECEBER APÓS O VENCIMENTO.</p>
                            <p>Boleto processado eletronicamente.</p>
                            <p>Referente a: {data.bancoNome} - Título: {data.nossoNumero || 'N/A'}</p>
                         </div>

                        {/* Marca D'água - Canto Superior Direito das instruções (alinhado com o fim do texto) */}
                         <div className="absolute right-2 bottom-2 w-[140px] opacity-15 pointer-events-none">
                            <img src="/logo-full.png" alt="Watermark" className="w-full object-contain grayscale" />
                         </div>
                    </div>

                </div>

                {/* COLUNA DIREITA */}
                <div className="flex-1 min-w-[130px] bg-gray-50/10">
                    {/* Vencimento - EDITÁVEL */}
                    <div className={`${cellContainer} ${highlightEdit} bg-red-50/30`}>
                        <label className={cellLabel}>Vencimento</label>
                        <input type="text" value={vencimento} onChange={e => setVencimento(e.target.value)} className={`${absoluteInput} text-right text-red-700 font-black`} />
                    </div>
                    {/* Agência */}
                    <div className={cellContainer}>
                        <label className={cellLabel}>Agência / Código Beneficiário</label>
                        <div className="absolute inset-x-1 bottom-1 text-right text-[10px] font-bold text-gray-800">{agenciaCodigo}</div>
                    </div>
                    {/* Nosso Número */}
                    <div className={cellContainer}>
                        <label className={cellLabel}>Nosso Número</label>
                         <div className="absolute inset-x-1 bottom-1 text-right text-[10px] font-bold text-gray-800">{nossoNumero}</div>
                    </div>
                    {/* Valor - EDITÁVEL - R$ junto */}
                    <div className={`${cellContainer} ${highlightEdit} bg-indigo-50/30`}>
                        <label className={cellLabel}>(=) Valor Documento</label>
                        <div className="absolute inset-x-1 bottom-0.5 flex justify-end items-baseline font-black text-gray-900">
                             <span className="text-[10px] mr-1">R$</span>
                             <input 
                                type="text" 
                                value={valor} 
                                onChange={e => setValor(e.target.value)} 
                                className="text-[11px] bg-transparent border-none p-0 text-right font-black w-24 outline-none" 
                            />
                        </div>
                    </div>
                     {/* Placeholder Descontos */}
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

            {/* Pagador - READ ONLY style but autofilled */}
            <div className="border-b border-gray-900 p-1.5 min-h-[48px] bg-gray-50/50">
                <label className={cellLabel}>Pagador</label>
                <div className="text-[10px] font-bold text-gray-900 mt-0.5 uppercase">
                    {pagador || "Preenchimento Automático..."}
                </div>
                {/* Linha 2 do pagador (endereço fixo ou placeholder) */}
                 <div className="text-[8px] text-gray-500 font-medium truncate">
                    Endereço Principal - CEP: 00000-000
                 </div>
            </div>

             <div className="py-0.5 px-3 border-b border-dashed border-gray-400 text-right bg-white">
                 <span className="text-[5px] text-gray-400 uppercase">Ficha de Compensação</span>
            </div>

            {/* ÁREA DE CÓDIGO DE BARRAS */}
            <div className="p-4 bg-white flex flex-col items-start gap-1">
                <p className="text-[8px] font-bold text-gray-900 ml-1">
                    Use o código de barras abaixo para pagamentos no Bankline:
                </p>
                
                {/* Numeração do Código de Barras (44 dígitos, formatados ou não, vamos por raw para facilitar leitura visual) */}
                 <p className="text-[10px] font-bold text-gray-700 tracking-widest font-mono ml-1 mb-1 select-all">
                    {data.codigoBarras}
                </p>

                {/* Barcode Component */}
                <div className="w-full flex justify-start overflow-hidden pl-1">
                     <Barcode 
                        value={data.codigoBarras} 
                        format="ITF" 
                        width={1.6} // Pouco mais estreito para caber se for muito longo
                        height={55} 
                        displayValue={false} 
                        margin={0}
                        background="transparent"
                        lineColor="#000"
                    />
                </div>
                
                 {/* Botão Copiar (Discreto) */}
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
