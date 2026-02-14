/**
 * BoletoPreview.tsx — Preview Visual de Boleto Bancário (V8)
 * 
 * V8:
 * - Logo removida (CDNs não funcionam), apenas nome do banco em texto.
 * - Espaçamento corrigido (bottom-1 em vez de bottom-0.5 para evitar corte).
 * - Campo Beneficiário com busca automática de CNPJ via BrasilAPI.
 * - Moeda: formato brasileiro com vírgula.
 */
import { forwardRef, useEffect, useState, useCallback } from 'react';
import { Copy, Check, Search, Loader2 } from 'lucide-react';
import type { BoletoData } from '../services/barcodeIntelligence';
import { lookupCNPJ } from '../services/barcodeIntelligence';
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
  
  // CNPJ lookup
  const [cnpjInput, setCnpjInput] = useState('');
  const [cnpjLoading, setCnpjLoading] = useState(false);

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

  // Busca CNPJ na BrasilAPI
  const handleCnpjLookup = useCallback(async () => {
    const clean = cnpjInput.replace(/\D/g, '');
    if (clean.length !== 14) return;
    
    setCnpjLoading(true);
    try {
      const result = await lookupCNPJ(clean);
      if (result) {
        const nome = result.fantasia || result.razaoSocial;
        const cnpjFormatado = clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
        setBeneficiario(`${nome} | ${cnpjFormatado}`);
      } else {
        setBeneficiario(cnpjInput); // Não encontrou, usa o texto digitado
      }
    } catch {
      setBeneficiario(cnpjInput);
    } finally {
      setCnpjLoading(false);
    }
  }, [cnpjInput]);

  // Auto-trigger lookup quando CNPJ atinge 14 dígitos
  useEffect(() => {
    const clean = cnpjInput.replace(/\D/g, '');
    if (clean.length === 14) {
      handleCnpjLookup();
    }
  }, [cnpjInput, handleCnpjLookup]);
  
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

  // Helper para formatar valor com vírgula brasileira
  const formatValorBR = (v: string) => {
    if (v.includes(',')) return v;
    return v.replace('.', ',');
  };

  // Estilos
  const cellLabel = "text-[6px] text-gray-500 uppercase font-bold leading-none mb-0.5 block";
  const absoluteInput = "absolute inset-x-1 bottom-1 text-[9px] text-gray-900 font-bold bg-transparent border-none p-0 focus:ring-0 placeholder:text-gray-300 outline-none leading-tight h-[14px]";
  const cellContainer = "relative border-b border-gray-300 p-1 h-[36px] overflow-hidden";
  const manualHighlight = "bg-yellow-50";
  
  return (
    <div
      ref={ref}
      className="bg-white p-4 max-w-[800px] mx-auto group"
    >
        <div 
            className="border-[1.5px] border-gray-900 rounded-sm overflow-hidden shadow-sm"
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
        
        {/* ========== CABEÇALHO ========== */}
        <div className="flex items-stretch border-b-2 border-gray-800 bg-white min-h-[44px]">
            {/* Nome do Banco (sem logo) */}
            <div className="flex items-center justify-center px-3 border-r-2 border-gray-800 min-w-[80px]">
                <span className="text-sm font-black text-gray-900 leading-none whitespace-nowrap">{data.bancoNome.split(' ')[0]}</span>
            </div>
            {/* Número do Banco (3 dígitos, sem -X) */}
            <div className="flex items-center justify-center px-2 border-r-2 border-gray-800 min-w-[50px]">
                <span className="text-sm font-black text-gray-900">{data.banco}</span>
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

                {/* Beneficiário — com busca por CNPJ */}
                <div className={`${cellContainer} ${manualHighlight} h-auto min-h-[36px]`}>
                    <label className={cellLabel}>Beneficiário</label>
                    {/* Se já tem beneficiário preenchido, mostra ele */}
                    {beneficiario ? (
                      <div className="text-[9px] font-bold text-gray-900 mt-0.5 leading-tight">{beneficiario}</div>
                    ) : (
                      /* Senão mostra input de CNPJ */
                      <div className="flex items-center gap-1 mt-0.5" data-html2canvas-ignore="true">
                        <input 
                          type="text" 
                          value={cnpjInput}
                          onChange={e => setCnpjInput(e.target.value)}
                          placeholder="Digite o CNPJ do Beneficiário"
                          className="text-[9px] text-gray-900 font-bold bg-transparent border-none p-0 focus:ring-0 placeholder:text-gray-300 outline-none leading-tight flex-1"
                        />
                        {cnpjLoading ? (
                          <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />
                        ) : (
                          <button onClick={handleCnpjLookup} className="text-indigo-500 hover:text-indigo-700">
                            <Search className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                    {/* Texto visível na exportação */}
                    <div className="pointer-events-none opacity-0 group-[.printing]:opacity-100">
                        <span className="text-[10px] font-bold text-gray-900">{beneficiario}</span>
                    </div>
                </div>

                {/* Instruções */}
                <div className="relative border-b border-gray-300 h-[140px] p-2 overflow-hidden flex flex-col">
                     <label className={cellLabel}>Instruções</label>
                     
                     <div className="relative z-10 text-[8px] text-gray-800 font-medium leading-tight mt-1 max-w-[80%]">
                        <p>Boleto processado eletronicamente pelo VisãoAgro. (favor confirmar as informações antes de efetuar o pagamento)</p>
                     </div>

                    {/* Marca D'água */}
                     <div className="absolute right-8 bottom-4 opacity-40 pointer-events-none w-[140px]">
                        <img src="/logo-full.png" alt="Watermark" className="w-full object-contain grayscale" />
                     </div>
                </div>

            </div>

            {/* DIREITA */}
            <div className="flex-1 min-w-[110px] bg-gray-50/20 border-l border-gray-300 -ml-[1px]">
                {/* Vencimento */}
                <div className={`${cellContainer} ${manualHighlight} bg-red-50/30`}>
                    <label className={cellLabel}>Vencimento</label>
                    <input type="text" value={vencimento} onChange={e => setVencimento(e.target.value)} className={`${absoluteInput} text-right text-red-700 font-black`} data-html2canvas-ignore="true" />
                    <div className="absolute inset-x-1 bottom-1 pointer-events-none opacity-0 group-[.printing]:opacity-100 text-right">
                        <span className="text-[10px] font-black text-red-700">{vencimento}</span>
                    </div>
                </div>
                {/* Agência */}
                <div className={cellContainer}>
                    <label className={cellLabel}>Agência / Código Beneficiário</label>
                    <input type="text" value={agenciaCodigo} onChange={e => setAgenciaCodigo(e.target.value)} className={`${absoluteInput} text-right`} data-html2canvas-ignore="true" />
                    <div className="absolute inset-x-1 bottom-1 pointer-events-none opacity-0 group-[.printing]:opacity-100 text-right">
                        <span className="text-[10px] font-bold text-gray-900">{agenciaCodigo}</span>
                    </div>
                </div>
                {/* Nosso Número */}
                <div className={cellContainer}>
                    <label className={cellLabel}>Nosso Número</label>
                     <div className="absolute inset-x-1 bottom-1 text-right text-[10px] font-bold text-gray-800">{nossoNumero}</div>
                </div>
                {/* Valor Documento */}
                <div className={`${cellContainer} ${manualHighlight} bg-indigo-50/30`}>
                    <label className={cellLabel}>(=) Valor Documento</label>
                    <div className="absolute inset-x-1 bottom-1 flex justify-end items-center font-black text-gray-900 gap-1">
                         <span className="text-[10px]">R$</span>
                         <input 
                            type="text" 
                            value={formatValorBR(valor)} 
                            onChange={e => setValor(e.target.value)} 
                            className="text-[11px] bg-transparent border-none p-0 text-right font-black w-20 outline-none" 
                            data-html2canvas-ignore="true"
                        />
                         <span className="text-[11px] font-black text-gray-900 hidden group-[.printing]:inline">{formatValorBR(valor)}</span>
                    </div>
                </div>
                 {/* Descontos */}
                 <div className={cellContainer}>
                    <label className={cellLabel}>(-) Desconto / Abatimento</label>
                </div>
                {/* Valor Cobrado */}
                <div className={`${cellContainer} bg-gray-100 flex flex-col justify-end`}>
                    <label className={cellLabel}>(=) Valor Cobrado</label>
                    <div className="text-right text-[11px] font-black mr-1 mb-1">R$ {formatValorBR(valor)}</div>
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
        <div className="p-2 bg-white flex flex-col items-center gap-1">
            <p className="text-[8px] font-bold text-gray-900 text-center w-full">
                Use o código de barras abaixo para pagamentos:
            </p>
            
             <p className="text-[10px] font-bold text-gray-700 tracking-widest font-mono text-center w-full select-all">
                {data.linhaDigitavel}
            </p>

            {/* Barcode */}
            <div className="w-full flex justify-center overflow-hidden">
                 <Barcode 
                    value={data.codigoBarras} 
                    format="ITF" 
                    width={1.6}
                    height={50} 
                    displayValue={false} 
                    margin={0}
                    background="transparent"
                    lineColor="#000"
                />
            </div>
            
             {/* Botão Copiar */}
            <div data-html2canvas-ignore="true" className="w-full mt-1 flex justify-center">
                <button onClick={handleCopy} className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copiado!" : "Copiar Código"}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
});

BoletoPreview.displayName = 'BoletoPreview';
