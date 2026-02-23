import React, { useState } from 'react';
import { X, Check, X as XClose, Image as ImageIcon, ArrowLeftCircle } from 'lucide-react';
import { U } from '../../utils';
import { useAppContext } from '../../context/AppContext';

export const OSDetailsModal = ({ os, onClose, onUpdateStatus }: any) => {
    const [confirmCancel, setConfirmCancel] = useState(false);
    const { dbAssets } = useAppContext();
    
    if (!os) return null;
    const getStatusColor = (s:string) => s === 'Pendente' ? 'bg-yellow-500' : s === 'Confirmado' ? 'bg-green-500' : 'bg-red-500';
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[90] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800">Detalhes da OS</h3>
                    <button onClick={onClose}><XClose className="w-6 h-6 text-gray-500"/></button>
                </div>
                <div className="p-6 overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-2xl font-bold text-gray-800">{os.numero ? `#${os.numero}` : os.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-sm text-gray-500">{U.formatDate(os.data_abertura || os.data)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-white text-xs font-bold ${getStatusColor(os.status)}`}>{os.status}</span>
                </div>
                    <div className="space-y-3">
                        <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500 uppercase font-bold mb-1">Módulo</p><p className="font-medium">{os.modulo}</p></div>
                        <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500 uppercase font-bold mb-1">Descrição Resumida</p><p className="font-medium">{os.descricao}</p></div>
                        {os.detalhes && (
                            <div className="border-t pt-3 mt-3">
                                <p className="text-sm font-bold mb-2">Dados Completos:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {/* Ordem forçada: Máquina, Bomba, Horímetro, Consumo, Custo, Obs, + outros */}
                                    {(() => {
                                        const desiredOrder = ['Máquina', 'Bomba', 'Horímetro', 'Consumo', 'Custo', 'Obs'];
                                        const entries = Object.entries(os.detalhes).filter(([key, value]) => key !== 'id' && key !== 'data' && value);
                                        
                                        // Ordenar as entradas baseado na array desiredOrder
                                        entries.sort((a, b) => {
                                            const indexA = desiredOrder.indexOf(a[0]);
                                            const indexB = desiredOrder.indexOf(b[0]);
                                            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                            if (indexA !== -1) return -1;
                                            if (indexB !== -1) return 1;
                                            // Se nenhum tiver na lista, mantém a ordem original
                                            return 0;
                                        });

                                        return entries.map(([key, value]) => {
                                            const fullWidth = key === 'Máquina' || key === 'Obs' || key === 'ALERTA MANUTENÇÃO';
                                            
                                            // Enrich Machine data if it's the 'Máquina' field
                                            let displayValue = String(value);
                                            if (key === 'Máquina' && dbAssets.maquinas) {
                                                const machineId = os.maquina_id || os.asset_id;
                                                const machine = dbAssets.maquinas.find((m: any) => 
                                                    (machineId && m.id === machineId) || 
                                                    m.nome?.trim().toLowerCase() === String(value).trim().toLowerCase() ||
                                                    m.id === String(value)
                                                );
                                                if (machine) {
                                                    displayValue = `${machine.nome || value}${machine.fabricante ? ` - ${machine.fabricante}` : ''}${machine.descricao ? ` - ${machine.descricao}` : ''}`;
                                                }
                                            }

                                            return (
                                                <div key={key} className={`bg-gray-50 p-2 rounded ${fullWidth ? 'col-span-2' : ''}`}>
                                                    <p className={`text-[10px] uppercase font-bold ${key === 'ALERTA MANUTENÇÃO' ? 'text-red-600' : 'text-gray-500'}`}>
                                                        {key}
                                                    </p>
                                                    <p className={`text-sm font-medium ${fullWidth ? '' : 'truncate'}`} title={displayValue}>
                                                        {displayValue}
                                                    </p>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        )}
                        {/* Foto Anexada */}
                        {os.arquivo_url && (
                            <div className="border-t pt-3 mt-3">
                                <p className="text-sm font-bold mb-2 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-purple-500" />
                                    Foto Anexada
                                </p>
                                <a href={os.arquivo_url} target="_blank" rel="noopener noreferrer" className="block">
                                    <img 
                                        src={os.arquivo_url} 
                                        alt={os.nome_arquivo || 'Foto do documento'} 
                                        className="w-full max-h-48 object-contain bg-gray-100 rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                    />
                                </a>
                                {os.nome_arquivo && (
                                    <p className="text-[10px] text-gray-400 mt-1 text-center">{os.nome_arquivo}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {os.status === 'Pendente' && (
                    <div className="p-4 border-t bg-gray-50 flex flex-col gap-3">
                        <div className="flex gap-3">
                            <button onClick={onClose} className="flex-1 py-3 bg-blue-100 text-blue-700 rounded-lg font-bold hover:bg-blue-200 flex items-center justify-center gap-2 transition-colors">
                                <ArrowLeftCircle className="w-5 h-5"/> Voltar
                            </button>
                            {!confirmCancel ? (
                                <button onClick={() => setConfirmCancel(true)} className="flex-1 py-3 bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 flex items-center justify-center gap-2 transition-colors">
                                    <X className="w-5 h-5"/> Cancelar
                                </button>
                            ) : (
                                <button onClick={() => { onUpdateStatus(os.id, 'Cancelado'); onClose(); }} className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 flex items-center justify-center gap-2 transition-colors animate-in zoom-in duration-200">
                                    <X className="w-5 h-5"/> Tem certeza?
                                </button>
                            )}
                        </div>
                        <button onClick={() => { onUpdateStatus(os.id, 'Confirmado'); onClose(); }} className="w-full py-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2 transition-colors text-lg shadow-md">
                            <Check className="w-6 h-6"/> Confirmar OS
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
};
