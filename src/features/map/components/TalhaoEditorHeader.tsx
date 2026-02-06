/**
 * TalhaoEditorHeader - Header do Editor de Talhões
 * 
 * Componente que exibe o cabeçalho do editor com título, 
 * instruções e botões de ação (desfazer e fechar).
 */
import React from 'react';
import { X, Undo2, Map as MapIcon, MousePointerClick } from 'lucide-react';

interface TalhaoEditorHeaderProps {
    onUndo: () => void;
    onClose: () => void;
    canUndo: boolean;
}

export function TalhaoEditorHeader({ onUndo, onClose, canUndo }: TalhaoEditorHeaderProps) {
    return (
        <div className="bg-white p-4 flex items-center justify-between border-b shadow-sm">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                    <MapIcon className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="font-bold text-gray-800 tracking-tight">Desenhar Talhão</h2>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase">
                        <MousePointerClick className="w-3 h-3" /> Clique no mapa para marcar os pontos
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 disabled:opacity-30 transition-all active:scale-95"
                >
                    <Undo2 className="w-5 h-5" />
                </button>
                <button 
                    onClick={onClose}
                    className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-all active:scale-95"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
