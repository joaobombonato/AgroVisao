/**
 * BoletoPreview.tsx — Preview Visual de Boleto Bancário (Compacto V2)
 * 
 * Layout otimizado para mobile:
 * - Removeu campos desnecessários (Data Doc, Espécie, Aceite, Uso Banco, Carteira).
 * - Compactou a altura das linhas.
 * - Marca d'água com logo oficial.
 * - Destaque claro em campos editáveis.
 */
import { forwardRef, useEffect, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { BoletoData } from '../services/barcodeIntelligence';

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
  const barcodeRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Estados locais para edição
  const [beneficiario, setBeneficiario] = useState(''); 
  const [pagador, setPagador] = useState('');
  const [vencimento, setVencimento] = useState(data.vencimento !== 'Não informado' ? data.vencimento : '');
  const [valor, setValor] = useState(data.valor !== '0.00' ? data.valor : '');
  const [agenciaCodigo, setAgenciaCodigo] = useState(data.agenciaCodigo || '');
  const [nossoNumero, setNossoNumero] = useState(data.nossoNumero || '');

  // Renderiza código de barras SVG
  useEffect(() => {
    const renderBarcode = async () => {
      // Requer ID para boleto.js (limitação da lib)
      const svgContainer = document.getElementById('boleto-barcode-svg');
      if (!svgContainer) return;

      try {
        const BoletoModule = await import('boleto.js');
        const Boleto = BoletoModule.default || BoletoModule;
        const boleto = new Boleto(data.codigoBarras);
        svgContainer.innerHTML = ''; // Limpa anterior
        boleto.toSVG('#boleto-barcode-svg'); 
      } catch (err) {
        console.warn('[BoletoPreview] SVG barcode fallback:', err);
        svgContainer.innerHTML = `
            <div class="bg-gray-50 p-2 text-center">
              <p class="text-[8px] text-gray-400 font-mono break-all">${data.codigoBarras}</p>
            </div>
          `;
      }
    };
    renderBarcode();
  }, [data.codigoBarras]);

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
    const num = parseFloat(val.replace(',', '.')); // Tenta lidar com virgula se usuario digitar
    if (isNaN(num)) return val;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Estilos
  // Reduzido mb-0.5 para mb-0 e text-[7px] para text-[6px] em alguns casos para compactar
  const cellLabel = "text-[6px] text-gray-500 uppercase font-bold leading-none mb-0.5 block";
  const cellInput = "w-full text-[10px] text-gray-900 font-semibold bg-transparent border-none p-0 focus:ring-0 placeholder:text-gray-400 outline-none leading-tight";
  const manualHighlight = "bg-yellow-100/50 hover:bg-yellow-100 transition-colors"; // Amarelo mais suave mas visível

  return (
    <div
      ref={ref}
      className="bg-white border-[1.5px] border-gray-900 rounded-sm overflow-hidden max-w-[800px] mx-auto shadow-none print:shadow-none print:border-black"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ========== CABEÇALHO COMPACTO ========== */}
      <div className="flex items-stretch border-b-2 border-gray-800 bg-white min-h-[36px]">
        <div className="flex items-center justify-center px-2 border-r-2 border-gray-800 min-w-[60px]">
           {/* Logo banco ou Nome (reduzido) */}
          <span className="text-xs font-black text-gray-900 leading-none truncate max-w-[80px]">{data.bancoNome.split(' ')[0]}</span>
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

      {/* ========== CORPO DO BOLETO (LAYOUT FLUIDO) ========== */}
      <div className="flex flex-col md:flex-row"> 
        {/* Layout Flex para Mobile: empilha colunas se necessário, mas aqui vamos tentar manter lado a lado com proporção */}
        
        <div className="flex w-full">
            {/* COLUNA ESQUERDA (DADOS PRINCIPAIS E INSTRUÇÕES) */}
            <div className="flex-[3] border-r border-gray-300">
                
                {/* LINHA 1: Local de Pagamento */}
                <div className={`border-b border-gray-300 p-1.5 h-[32px]`}>
                    <label className={cellLabel}>Local de Pagamento</label>
                    <div className="text-[9px] text-gray-900 font-semibold truncate leading-tight">Pagável em qualquer banco até o vencimento</div>
                </div>

                {/* LINHA 2: Beneficiário (Manual) */}
                <div className={`border-b border-gray-300 p-1.5 h-[32px] ${manualHighlight} relative group`}>
                    <label className={cellLabel}>Beneficiário</label>
                    <input 
                        type="text" 
                        value={beneficiario}
                        onChange={e => setBeneficiario(e.target.value)}
                        placeholder="Digite o Nome do Beneficiário..."
                        className={`${cellInput} font-bold`}
                        data-html2canvas-ignore="true" 
                    />
                    <div className="absolute inset-0 p-1.5 pt-3 pointer-events-none opacity-0 group-[.printing]:opacity-100">
                        <span className="text-[9px] font-bold text-gray-900">{beneficiario}</span>
                    </div>
                </div>

                {/* ÁREA DE INSTRUÇÕES (EXPANDIDA, SEM LINHAS INTERMEDIÁRIAS) */}
                <div className="relative border-b border-gray-300 h-[100px] p-2 overflow-hidden flex flex-col">
                    <label className={cellLabel}>Instruções (Texto de Responsabilidade do Beneficiário)</label>
                    
                    {/* Marca D'água Logo */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-[0.05] grayscale">
                        <img src="/logo-full.png" alt="Marca D'água" className="w-[60%] object-contain" />
                    </div>

                    <div className="relative z-10 mt-1 space-y-1">
                        <p className="text-[9px] font-bold text-gray-800">
                            SR. CAIXA, NÃO RECEBER APÓS O VENCIMENTO.
                        </p>
                        <p className="text-[8px] text-gray-600">
                            Boleto processado eletronicamente.
                            <br/>
                            Referente a: {data.bancoNome}
                        </p>
                    </div>
                    
                    {/* Espaço livre para parecer real */}
                </div>
            </div>

            {/* COLUNA DIREITA (VALORES E DATAS) */}
            <div className="flex-1 min-w-[110px] bg-gray-50/10">
                {/* VENCIMENTO */}
                <div className="border-b border-gray-300 p-1.5 h-[32px] bg-red-50/40">
                    <label className={cellLabel}>Vencimento</label>
                    <input 
                        type="text" 
                        value={vencimento}
                        onChange={e => setVencimento(e.target.value)}
                        className={`${cellInput} text-right font-black text-[10px] text-red-700`} 
                    />
                </div>

                {/* AGÊNCIA / CÓDIGO */}
                <div className="border-b border-gray-300 p-1.5 h-[32px]">
                    <label className={cellLabel}>Agência / Código Beneficiário</label>
                    <input 
                        type="text" 
                        value={agenciaCodigo}
                        onChange={e => setAgenciaCodigo(e.target.value)}
                        className={`${cellInput} text-right`} 
                    />
                </div>

                {/* NOSSO NÚMERO */}
                <div className="border-b border-gray-300 p-1.5 h-[32px]">
                    <label className={cellLabel}>Nosso Número</label>
                    <input 
                        type="text" 
                        value={nossoNumero}
                        onChange={e => setNossoNumero(e.target.value)}
                        className={`${cellInput} text-right`} 
                    />
                </div>

                 {/* (=) VALOR DOCUMENTO */}
                 <div className="border-b border-gray-300 p-1.5 h-[32px] bg-indigo-50/40">
                    <label className={cellLabel}>(=) Valor Documento</label>
                    <div className="flex justify-end items-center gap-1">
                        <span className="text-[8px]">R$</span>
                        <input 
                            type="text" 
                            value={valor}
                            onChange={e => setValor(e.target.value)}
                            className={`${cellInput} text-right font-black text-[10px]`} 
                        />
                    </div>
                </div>

                {/* GAP FILLERS PARA ALINHAR COM ESQUERDA */}
                 <div className="border-b border-gray-300 p-1.5 h-[32px]">
                    <label className={cellLabel}>(-) Descontos / Abatimentos</label>
                </div>
                 <div className="border-b border-gray-300 p-1.5 h-[32px/2] flex-1 flex flex-col justify-center">
                    <label className={cellLabel}>(=) Valor Cobrado</label>
                     <div className="text-right text-[10px] font-black text-gray-900">
                        {formatCurrency(valor)}
                     </div>
                </div>
            </div>
        </div>
      </div>

      {/* ========== RODAPÉ: PAGADOR ========== */}
      <div className={`border-b border-gray-900 p-1.5 min-h-[44px] ${manualHighlight} relative group`}>
         <label className={cellLabel}>Pagador (Sacado)</label>
         <div className="flex gap-2 items-start mt-0.5">
             <input 
                 type="text" 
                 value={pagador}
                 onChange={e => setPagador(e.target.value)}
                 placeholder="Nome do Pagador, CPF/CNPJ..."
                 className={`${cellInput} font-bold h-full`}
                 data-html2canvas-ignore="true"
             />
             <div className="absolute inset-x-1.5 top-4 pointer-events-none opacity-0 group-[.printing]:opacity-100">
                <span className="text-[9px] font-bold text-gray-900">{pagador}</span>
             </div>
         </div>
      </div>
      <div className="border-b border-gray-900 p-0.5 px-1 text-right bg-white">
          <span className="text-[5px] font-bold text-gray-400 uppercase">Autenticação Mecânica / Ficha de Compensação</span>
      </div>

       {/* ========== CÓDIGO DE BARRAS & AÇÕES ========== */}
       <div className="p-2 bg-white flex flex-col gap-2">
           {/* Botão Copiar (Escondido no Print/Export) */}
           <div data-html2canvas-ignore="true">
                <button
                type="button"
                onClick={handleCopy}
                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-[10px] transition-all active:scale-[0.98] shadow-sm ${
                    copied 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                }`}
                >
                {copied ? (
                    <><Check className="w-3 h-3" /> Copiado!</>
                ) : (
                    <><Copy className="w-3 h-3" /> Copiar Linha Digitável</>
                )}
                </button>
           </div>
           
           {/* Barcode Visual (Compacto) */}
            <div className="flex items-center justify-center overflow-hidden h-[40px] w-full">
               <div id="boleto-barcode-svg" className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-[400px]" />
            </div>
       </div>

    </div>
  );
});

BoletoPreview.displayName = 'BoletoPreview';
