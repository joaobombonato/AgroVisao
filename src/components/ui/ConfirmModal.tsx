import React from 'react';
import { Trash2 } from 'lucide-react';

export const ConfirmModal = ({ message, onConfirm, onClose }: any) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
    <div className="bg-white rounded-lg w-full max-w-xs shadow-2xl">
      <div className="p-4 border-b"><h3 className="text-lg font-bold text-red-600 flex items-center gap-2"><Trash2 className="w-5 h-5" /> Confirmação</h3></div>
      <div className="p-4"><p className="text-gray-700">{message}</p></div>
      <div className="p-4 flex justify-end gap-3 border-t">
        <button onClick={onClose} className="px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 font-medium">Cancelar</button>
        <button onClick={onConfirm} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors">Confirmar</button>
      </div>
    </div>
  </div>
);
