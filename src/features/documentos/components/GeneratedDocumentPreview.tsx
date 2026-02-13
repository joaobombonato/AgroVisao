import { forwardRef } from 'react';
import { Loader2, X, Download, Paperclip } from 'lucide-react';
import { DanfePreview, type DanfeExtraFields } from './DanfePreview';
import { BoletoPreview, type BoletoExtraFields } from './BoletoPreview';
import type { ParsedBarcode, NFeData, BoletoData } from '../services/barcodeIntelligence';

interface GeneratedDocumentPreviewProps {
  documentPreview: ParsedBarcode;
  processingBarcode: boolean;
  onClose: () => void;
  onDanfeDataChange: (data: NFeData & DanfeExtraFields) => void;
  onBoletoDataChange: (data: BoletoData & BoletoExtraFields) => void;
  onDownload: () => void;
  onExport: () => void;
  exporting: boolean;
}

export const GeneratedDocumentPreview = forwardRef<HTMLDivElement, GeneratedDocumentPreviewProps>(({
  documentPreview,
  processingBarcode,
  onClose,
  onDanfeDataChange,
  onBoletoDataChange,
  onDownload,
  onExport,
  exporting
}, ref) => {
  if (processingBarcode) {
    return (
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm font-bold text-blue-700">Processando código de barras...</p>
        <p className="text-xs text-blue-400">Identificando tipo, extraindo dados e consultando CNPJ</p>
      </div>
    );
  }

  if (!documentPreview) return null;

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white border-2 border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
          {documentPreview.type === 'nfe' ? '🧾' : '💳'}
          {documentPreview.type === 'nfe' ? 'DANFE Gerada' : 'Boleto Identificado'}
        </h3>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      
      {/* Renderiza Preview */}
      {documentPreview.type === 'nfe' && (
        <DanfePreview ref={ref} data={documentPreview as NFeData} onDataChange={onDanfeDataChange} />
      )}
      {(documentPreview.type === 'boleto_bancario' || documentPreview.type === 'boleto_convenio') && (
        <BoletoPreview 
            ref={ref} 
            data={documentPreview as BoletoData} 
            onDataChange={onBoletoDataChange}
        />
      )}
      
      {/* Botões de Ação */}
      <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onDownload}
            className="bg-gray-100 text-gray-700 py-3 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-gray-200 active:scale-[0.98] transition-all border border-gray-300"
          >
            <Download className="w-5 h-5" /> Salvar (Baixar)
          </button>

          <button
            onClick={onExport}
            disabled={exporting}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {exporting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Gerando...</>
            ) : (
              <><Paperclip className="w-5 h-5" /> Anexar Imagem</>
            )}
          </button>
      </div>
    </div>
  );
});

GeneratedDocumentPreview.displayName = 'GeneratedDocumentPreview';
