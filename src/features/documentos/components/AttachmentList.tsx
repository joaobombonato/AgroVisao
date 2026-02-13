import { Paperclip, Trash2, Image as ImageIcon, FileText } from 'lucide-react';
import { type FileAttachment } from '../hooks/useAttachments';

interface AttachmentListProps {
  attachments: FileAttachment[];
  onRemove: (id: string) => void;
  onAddClick: () => void;
  uploading: boolean;
}

export const AttachmentList = ({ attachments, onRemove, onAddClick, uploading }: AttachmentListProps) => {
  return (
    <div className="space-y-2 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-3">
        <div className="flex items-center justify-between mb-2">
           <div className="flex items-center gap-2">
               <Paperclip className="w-4 h-4 text-gray-400" />
               <span className="text-xs font-bold text-gray-500">Anexos ({attachments.length})</span>
           </div>
           <button type="button" onClick={onAddClick} className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded font-bold hover:bg-purple-200">
               + ADICIONAR
           </button>
        </div>

        {attachments.length === 0 && (
           <div className="text-center py-4 text-gray-400 text-xs italic">
               Nenhum arquivo anexado.
           </div>
        )}

        {attachments.map(att => (
           <div key={att.id} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded shadow-sm animate-in fade-in slide-in-from-left-2">
               <div className="flex items-center gap-2 overflow-hidden">
                   {(att.type === 'camera' || att.type === 'generated') ? <ImageIcon className="w-4 h-4 text-purple-500"/> : <FileText className="w-4 h-4 text-blue-500"/>}
                   <div className="flex flex-col">
                       <span className="text-[10px] font-bold text-gray-700 truncate max-w-[150px]" title={att.name}>{att.name}</span>
                       <span className="text-[8px] text-gray-400 uppercase">{att.type}</span>
                   </div>
               </div>
               <button type="button" onClick={() => onRemove(att.id)} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-colors">
                   <Trash2 className="w-3.5 h-3.5"/>
               </button>
           </div>
        ))}
        
        {uploading && <div className="text-[10px] text-purple-500 text-center animate-pulse">Enviando...</div>}
    </div>
  );
};
