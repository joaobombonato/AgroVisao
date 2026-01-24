import React from 'react';
import { MapPinned, Save, ArrowLeft, Loader2 } from 'lucide-react';

interface MapHeaderProps {
  hasChanges: boolean;
  saving: boolean;
  onSave: () => void;
  onBack: () => void;
}

/**
 * Header do MapScreen com título, botão salvar e voltar.
 */
export const MapHeader: React.FC<MapHeaderProps> = ({
  hasChanges,
  saving,
  onSave,
  onBack,
}) => (
  <div className="flex items-center justify-between mb-4 pb-2 border-b pl-2 pr-2">
    <div className="flex items-center gap-2">
       <MapPinned className="w-7 h-7 text-green-700" />
       <h1 className="text-xl font-bold text-gray-800">Mapas e Satélite</h1>
    </div>
    <div className="flex items-center gap-2">
       {hasChanges && (
          <button onClick={onSave} disabled={saving} className="flex items-center gap-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-full transition-colors shadow-sm disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
          </button>
       )}
       <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-blue-600 bg-gray-100 px-3 py-1.5 rounded-full transition-colors">
          <ArrowLeft className="w-4 h-4 ml-1" /> Voltar
       </button>
    </div>
  </div>
);
