/**
 * DanfePreview.tsx — DANFE Simplificada Visual
 * 
 * Monta um preview profissional da NF-e com os dados extraídos da chave de acesso.
 * NÃO tem validade fiscal — é apenas um resumo visual para referência.
 */
import { forwardRef } from 'react';
import { FileText, Shield, ExternalLink } from 'lucide-react';
import type { NFeData } from '../../services/barcodeIntelligence';

interface DanfePreviewProps {
  data: NFeData;
}

export const DanfePreview = forwardRef<HTMLDivElement, DanfePreviewProps>(({ data }, ref) => {
  return (
    <div 
      ref={ref}
      className="bg-white border-2 border-gray-800 rounded-lg overflow-hidden max-w-sm mx-auto shadow-lg"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <span className="font-bold text-sm tracking-wider">DANFE SIMPLIFICADA</span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">PREVIEW</span>
        </div>
        <p className="text-[9px] text-gray-300 mt-1">Documento Auxiliar da Nota Fiscal Eletrônica</p>
      </div>

      {/* Modelo / Série / Número */}
      <div className="grid grid-cols-3 border-b border-gray-300 text-center">
        <div className="p-2 border-r border-gray-300">
          <p className="text-[8px] text-gray-500 uppercase font-bold">Modelo</p>
          <p className="text-sm font-bold text-gray-800">{data.modelo}</p>
        </div>
        <div className="p-2 border-r border-gray-300">
          <p className="text-[8px] text-gray-500 uppercase font-bold">Série</p>
          <p className="text-sm font-bold text-gray-800">{data.serie}</p>
        </div>
        <div className="p-2">
          <p className="text-[8px] text-gray-500 uppercase font-bold">Número</p>
          <p className="text-sm font-bold text-indigo-700">{data.numero}</p>
        </div>
      </div>

      {/* Emitente */}
      <div className="p-3 border-b border-gray-300 bg-gray-50">
        <p className="text-[8px] text-gray-500 uppercase font-bold mb-1">Emitente</p>
        {data.emitente ? (
          <>
            <p className="text-sm font-bold text-gray-800 leading-tight">{data.emitente}</p>
            {data.fantasia && data.fantasia !== data.emitente && (
              <p className="text-[11px] text-gray-500 italic">{data.fantasia}</p>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-400 italic">Consulta CNPJ indisponível</p>
        )}
        <div className="flex gap-4 mt-1.5">
          <div>
            <span className="text-[8px] text-gray-400">CNPJ</span>
            <p className="text-[11px] font-mono text-gray-700">{data.cnpjFormatado}</p>
          </div>
          {data.municipio && (
            <div>
              <span className="text-[8px] text-gray-400">Local</span>
              <p className="text-[11px] text-gray-700">{data.municipio}</p>
            </div>
          )}
        </div>
      </div>

      {/* UF + Data */}
      <div className="grid grid-cols-2 border-b border-gray-300">
        <div className="p-2.5 border-r border-gray-300">
          <p className="text-[8px] text-gray-500 uppercase font-bold">UF Emissão</p>
          <p className="text-sm font-bold text-gray-800">{data.ufSigla}</p>
        </div>
        <div className="p-2.5">
          <p className="text-[8px] text-gray-500 uppercase font-bold">Competência</p>
          <p className="text-sm font-bold text-gray-800">{data.anoMes}</p>
        </div>
      </div>

      {/* Chave de Acesso */}
      <div className="p-3 border-b border-gray-300 bg-blue-50/50">
        <div className="flex items-center gap-1 mb-1.5">
          <Shield className="w-3 h-3 text-blue-600" />
          <p className="text-[8px] text-blue-700 uppercase font-bold">Chave de Acesso</p>
        </div>
        <p className="text-[10px] font-mono text-gray-700 leading-relaxed break-all bg-white p-2 rounded border border-blue-200">
          {data.chaveFormatada}
        </p>
      </div>

      {/* Rodapé */}
      <div className="p-2.5 bg-gray-100 text-center">
        <div className="flex items-center justify-center gap-1 text-[9px] text-gray-500">
          <ExternalLink className="w-3 h-3" />
          <span>Consulte: <strong>nfe.fazenda.gov.br</strong></span>
        </div>
        <p className="text-[7px] text-gray-400 mt-0.5">
          Preview gerado por VisãoAgro • Sem validade fiscal
        </p>
      </div>
    </div>
  );
});

DanfePreview.displayName = 'DanfePreview';
