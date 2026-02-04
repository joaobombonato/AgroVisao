import React from 'react';
import { MapPinned, Save, ArrowLeft, Loader2, Pencil, X } from 'lucide-react';

interface MapHeaderProps {
  hasChanges: boolean;
  saving: boolean;
  onSave: () => void;
  onBack: () => void;
  isEditMode?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  hideEditButton?: boolean;
  fazendaNome?: string;
  recCode?: string;
}

/**
 * Header do MapScreen com título, botão salvar e voltar.
 */
export const MapHeader: React.FC<MapHeaderProps> = ({
  hasChanges,
  saving,
  onSave,
  onBack,
  isEditMode,
  onEdit,
  onCancel,
  hideEditButton,
  fazendaNome,
  recCode
}) => (
  <div className="flex items-center justify-between mb-4 pb-2 border-b pl-2 pr-2">
    <div className="flex items-center gap-3">
       <MapPinned className="w-7 h-7 text-green-700" />
       <div>
         <h1 className="text-xl font-bold text-gray-800">{fazendaNome || 'Mapas e Satélite'}</h1>
         {recCode && (
           <span className="text-[10px] bg-blue-100 text-blue-700 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
             Região: {recCode}
           </span>
         )}
       </div>
    </div>
    <div className="flex items-center gap-2">
      {/* Se não está em edição, mostra Editar (se não estiver escondido) */}
       {!isEditMode && onEdit && !hideEditButton && (
         <button onClick={onEdit} className="flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-full transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Editar Limite
         </button>
       )}

       {/* Se está em edição e tem mudanças, mostra Salvar. Se não, mostra Cancelar/Concluir */}
       {isEditMode && (
         <>
            {hasChanges ? (
              <button onClick={onSave} disabled={saving} className="flex items-center gap-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-full transition-colors shadow-sm disabled:opacity-50 animate-in fade-in">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
              </button>
            ) : (
                <button onClick={onCancel} className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors">
                  <X className="w-4 h-4" /> Fechar Edição
                </button>
            )}
         </>
       )}

       <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-blue-600 bg-gray-100 px-3 py-1.5 rounded-full transition-colors">
          <ArrowLeft className="w-4 h-4 ml-1" /> Voltar
       </button>
    </div>
  </div>
);
